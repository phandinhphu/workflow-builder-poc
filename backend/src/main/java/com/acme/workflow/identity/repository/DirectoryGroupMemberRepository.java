package com.acme.workflow.identity.repository;

import com.acme.workflow.identity.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface DirectoryGroupMemberRepository extends JpaRepository<DirectoryGroupMember, DirectoryGroupMemberId> {
    List<DirectoryGroupMember> findByGroupId(String groupId);
    List<DirectoryGroupMember> findByUserId(String userId);
    void deleteByGroupId(String groupId);
}
