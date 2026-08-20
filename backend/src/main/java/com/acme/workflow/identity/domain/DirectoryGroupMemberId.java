package com.acme.workflow.identity.domain;

import java.io.Serializable;
import java.util.Objects;

public class DirectoryGroupMemberId implements Serializable {
    public String groupId;
    public String userId;
    public DirectoryGroupMemberId() {}
    public DirectoryGroupMemberId(String groupId, String userId) { this.groupId = groupId; this.userId = userId; }
    @Override public boolean equals(Object value) { return value instanceof DirectoryGroupMemberId other && Objects.equals(groupId, other.groupId) && Objects.equals(userId, other.userId); }
    @Override public int hashCode() { return Objects.hash(groupId, userId); }
}
