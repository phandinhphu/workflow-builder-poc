package com.acme.workflow.ticket.repository;

import com.acme.workflow.ticket.domain.TicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<TicketEntity, String> {
    Optional<TicketEntity> findByTicketCode(String ticketCode);

    Optional<TicketEntity> findByWorkflowInstanceId(String workflowInstanceId);

    List<TicketEntity> findByInitiatorIdOrderByCreatedAtDesc(String initiatorId);

    List<TicketEntity> findAllByOrderByCreatedAtDesc();

    @Query("SELECT t FROM TicketEntity t WHERE " +
           "(:initiatorId IS NULL OR t.initiatorId = :initiatorId) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:categoryId IS NULL OR t.categoryId = :categoryId) AND " +
           "(:query IS NULL OR LOWER(t.ticketCode) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.initiatorName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY t.createdAt DESC")
    List<TicketEntity> searchTickets(
            @Param("initiatorId") String initiatorId,
            @Param("status") String status,
            @Param("categoryId") String categoryId,
            @Param("query") String query);
}
