package com.acme.workflow.runtime.domain;
import java.io.Serializable;
import java.util.Objects;
public class TaskCandidateUserId implements Serializable {
    public String taskId; public String userId;
    public TaskCandidateUserId() {}
    public TaskCandidateUserId(String taskId, String userId) { this.taskId=taskId; this.userId=userId; }
    @Override public boolean equals(Object value) { return value instanceof TaskCandidateUserId other && Objects.equals(taskId, other.taskId) && Objects.equals(userId, other.userId); }
    @Override public int hashCode() { return Objects.hash(taskId, userId); }
}
