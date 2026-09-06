package com.acme.workflow.runtime.executor;

import java.util.Set;

public interface NodeExecutor {
    Set<String> supportedTypes();

    void execute(NodeExecutionContext ctx);
}
