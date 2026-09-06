package com.acme.workflow.runtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/runtime/participants")
public class ParticipantImportController {
    private final ParticipantImportService importService;

    public ParticipantImportController(ParticipantImportService importService) {
        this.importService = importService;
    }

    @PostMapping(value = "/preview-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> previewFile(@RequestParam("file") MultipartFile file) {
        return importService.previewImport(file);
    }

    @PostMapping("/preview-identifiers")
    public Map<String, Object> previewIdentifiers(@RequestBody ObjectNode request) {
        List<String> identifiers = new ArrayList<>();
        JsonNode ids = request.path("identifiers");
        if (ids.isArray()) {
            ids.forEach(id -> identifiers.add(id.asText()));
        }
        return importService.previewFromIdentifiers(identifiers);
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        byte[] content = importService.generateExcelTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=participant_import_template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }
}
