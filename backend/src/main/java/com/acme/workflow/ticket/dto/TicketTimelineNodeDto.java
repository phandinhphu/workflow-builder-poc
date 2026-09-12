package com.acme.workflow.ticket.dto;

import java.time.Instant;

public class TicketTimelineNodeDto {
    public String nodeId;
    public String nodeName;
    public String nodeType;
    public String state;
    public String outcomePort;
    public Instant startedAt;
    public Instant completedAt;
    public String assigneeId;
    public String assigneeName;
    public String action;
    public String comment;
    public int executionOrder;
}
