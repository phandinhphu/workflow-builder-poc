package com.acme.workflow.runtime;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.runtime.executor.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NodeExecutorFactoryTest {
    private NodeExecutorFactory factory;
    private StartNodeExecutor startExecutor;
    private EndNodeExecutor endExecutor;
    private ConditionNodeExecutor conditionExecutor;
    private SystemNodeExecutor systemExecutor;

    @BeforeEach
    void setUp() {
        startExecutor = new StartNodeExecutor();
        endExecutor = new EndNodeExecutor();
        conditionExecutor = new ConditionNodeExecutor();
        systemExecutor = new SystemNodeExecutor();
        factory = new NodeExecutorFactory(List.of(
                startExecutor,
                endExecutor,
                conditionExecutor,
                systemExecutor,
                new NotificationNodeExecutor(),
                new DataTransformNodeExecutor(),
                new TimerNodeExecutor(),
                new WaitEventNodeExecutor(),
                new ParallelSplitNodeExecutor(),
                new JoinNodeExecutor(),
                new SubworkflowNodeExecutor()
        ));
    }

    @Test
    void resolvesCorrectExecutorByNodeType() {
        assertThat(factory.getExecutor("START")).isSameAs(startExecutor);
        assertThat(factory.getExecutor("start")).isSameAs(startExecutor);
        assertThat(factory.getExecutor("END")).isSameAs(endExecutor);
        assertThat(factory.getExecutor("CONDITION")).isSameAs(conditionExecutor);
        assertThat(factory.getExecutor("SYSTEM")).isSameAs(systemExecutor);
        assertThat(factory.getExecutor("HTTP")).isSameAs(systemExecutor);
    }

    @Test
    void throwsExceptionOnUnknownOrNullNodeType() {
        assertThatThrownBy(() -> factory.getExecutor("UNKNOWN_NODE"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Không có runtime handler cho UNKNOWN_NODE");

        assertThatThrownBy(() -> factory.getExecutor(null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Node type không được để trống");
    }
}
