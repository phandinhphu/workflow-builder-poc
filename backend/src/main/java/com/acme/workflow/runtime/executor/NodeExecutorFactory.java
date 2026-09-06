package com.acme.workflow.runtime.executor;

import com.acme.workflow.common.ApiException;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NodeExecutorFactory {
    private final Map<String, NodeExecutor> executors = new HashMap<>();

    public NodeExecutorFactory(List<NodeExecutor> executorList) {
        for (NodeExecutor executor : executorList) {
            for (String type : executor.supportedTypes()) {
                executors.put(type.toUpperCase(), executor);
            }
        }
    }

    public NodeExecutor getExecutor(String nodeType) {
        if (nodeType == null) {
            throw ApiException.badRequest("NODE_HANDLER_MISSING", "Node type không được để trống");
        }
        NodeExecutor executor = executors.get(nodeType.toUpperCase());
        if (executor == null) {
            throw ApiException.badRequest("NODE_HANDLER_MISSING", "Không có runtime handler cho " + nodeType);
        }
        return executor;
    }
}
