package com.acme.workflow.workflowtype.validator;

import com.acme.workflow.workflowtype.dto.ValidationRuleDto;

import java.util.List;
import java.util.Map;

/**
 * Interface cho các handler xử lý quy tắc kiểm tra theo loại workflow.
 */
public interface WorkflowTypeRuleHandler {
    /**
     * Kiểm tra xem handler có hỗ trợ mã quy tắc (ruleCode) này hay không.
     */
    boolean supports(String ruleCode);

    /**
     * Đánh giá quy tắc đối với context của workflow hiện tại.
     * Thêm các lỗi phát hiện được vào danh sách errors.
     */
    void evaluate(WorkflowValidationContext context, ValidationRuleDto rule, List<Map<String, Object>> errors);
}
