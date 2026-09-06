package com.acme.workflow.runtime;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.directory.DirectoryService;
import com.acme.workflow.identity.domain.HrmUser;
import com.acme.workflow.identity.repository.HrmUserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class ParticipantImportService {
    private final HrmUserRepository userRepository;
    private final DirectoryService directoryService;

    public ParticipantImportService(HrmUserRepository userRepository, DirectoryService directoryService) {
        this.userRepository = userRepository;
        this.directoryService = directoryService;
    }

    public Map<String, Object> previewImport(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("FILE_EMPTY", "File tải lên không có dữ liệu");
        }
        String filename = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        List<String> rawIdentifiers;
        try {
            if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                rawIdentifiers = parseExcel(file.getInputStream());
            } else if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
                rawIdentifiers = parseCsv(file.getInputStream());
            } else {
                throw ApiException.badRequest("UNSUPPORTED_FILE_TYPE", "Chỉ hỗ trợ file định dạng .xlsx, .xls, .csv");
            }
        } catch (IOException e) {
            throw ApiException.badRequest("FILE_PARSE_ERROR", "Không thể đọc nội dung file: " + e.getMessage());
        }

        return validateAndBuildPreview(rawIdentifiers);
    }

    public Map<String, Object> previewFromIdentifiers(List<String> rawIdentifiers) {
        return validateAndBuildPreview(rawIdentifiers == null ? List.of() : rawIdentifiers);
    }

    private List<String> parseExcel(InputStream is) throws IOException {
        List<String> result = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int codeCol = 0;
            boolean headerChecked = false;
            for (Row row : sheet) {
                if (row == null) continue;
                Cell firstCell = row.getCell(0);
                String firstVal = getCellString(firstCell).trim();
                if (!headerChecked) {
                    headerChecked = true;
                    for (int c = 0; c < row.getLastCellNum(); c++) {
                        String header = getCellString(row.getCell(c)).toLowerCase(Locale.ROOT);
                        if (header.contains("code") || header.contains("mã") || header.contains("email") || header.contains("username") || header.contains("nhân viên")) {
                            codeCol = c;
                            break;
                        }
                    }
                    if (firstVal.equalsIgnoreCase("mã nv") || firstVal.equalsIgnoreCase("employee code") || firstVal.equalsIgnoreCase("email") || firstVal.equalsIgnoreCase("username")) {
                        continue;
                    }
                }
                Cell targetCell = row.getCell(codeCol);
                String val = getCellString(targetCell).trim();
                if (!val.isBlank()) {
                    result.add(val);
                }
            }
        }
        return result;
    }

    private List<String> parseCsv(InputStream is) throws IOException {
        List<String> result = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            boolean isFirst = true;
            int codeCol = 0;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isBlank()) continue;
                String[] parts = line.split("[,;\t]");
                if (isFirst) {
                    isFirst = false;
                    for (int i = 0; i < parts.length; i++) {
                        String header = parts[i].trim().toLowerCase(Locale.ROOT);
                        if (header.contains("code") || header.contains("mã") || header.contains("email") || header.contains("username")) {
                            codeCol = i;
                            break;
                        }
                    }
                    String firstVal = parts[0].trim().toLowerCase(Locale.ROOT);
                    if (firstVal.contains("mã") || firstVal.contains("code") || firstVal.contains("email")) {
                        continue;
                    }
                }
                if (codeCol < parts.length) {
                    String val = parts[codeCol].trim().replace("\"", "");
                    if (!val.isBlank()) {
                        result.add(val);
                    }
                }
            }
        }
        return result;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double num = cell.getNumericCellValue();
                if (num == Math.floor(num)) {
                    yield String.valueOf((long) num);
                }
                yield String.valueOf(num);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private Map<String, Object> validateAndBuildPreview(List<String> rawIdentifiers) {
        List<Map<String, Object>> validUsers = new ArrayList<>();
        List<Map<String, Object>> invalidRows = new ArrayList<>();
        Set<String> seenUserIds = new HashSet<>();

        int rowIndex = 1;
        for (String raw : rawIdentifiers) {
            String token = raw.trim();
            if (token.isBlank()) continue;

            Optional<HrmUser> found = userRepository.findByEmployeeCode(token)
                    .or(() -> userRepository.findByEmail(token))
                    .or(() -> userRepository.findByUsername(token))
                    .or(() -> userRepository.findById(token));

            if (found.isEmpty()) {
                invalidRows.add(Map.of(
                        "rowIndex", rowIndex,
                        "rawIdentifier", token,
                        "reason", "Không tìm thấy nhân viên trong hệ thống HRM"
                ));
            } else {
                HrmUser user = found.get();
                if (!"ACTIVE".equalsIgnoreCase(user.status)) {
                    invalidRows.add(Map.of(
                            "rowIndex", rowIndex,
                            "rawIdentifier", token,
                            "reason", "Nhân viên đã nghỉ việc hoặc ở trạng thái Inactive (" + user.displayName + ")"
                    ));
                } else if (!seenUserIds.add(user.id)) {
                    invalidRows.add(Map.of(
                            "rowIndex", rowIndex,
                            "rawIdentifier", token,
                            "reason", "Trùng lặp nhân viên trong danh sách (" + user.displayName + ")"
                    ));
                } else {
                    validUsers.add(directoryService.user(user.id));
                }
            }
            rowIndex++;
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalRows", rawIdentifiers.size());
        response.put("validCount", validUsers.size());
        response.put("invalidCount", invalidRows.size());
        response.put("validUsers", validUsers);
        response.put("invalidRows", invalidRows);
        return response;
    }

    public byte[] generateExcelTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Participants");
            Row header = sheet.createRow(0);

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            String[] columns = {"Mã nhân viên (Employee Code)", "Họ và tên (Tùy chọn)", "Email (Tùy chọn)", "Ghi chú"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Example row
            Row example1 = sheet.createRow(1);
            example1.createCell(0).setCellValue("EMP001");
            example1.createCell(1).setCellValue("Nguyễn Văn A");
            example1.createCell(2).setCellValue("a.nguyen@acme.com");
            example1.createCell(3).setCellValue("Nhân viên phát triển");

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
