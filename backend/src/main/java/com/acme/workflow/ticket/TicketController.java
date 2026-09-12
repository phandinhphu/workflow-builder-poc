package com.acme.workflow.ticket;

import com.acme.workflow.ticket.dto.CreateTicketRequest;
import com.acme.workflow.ticket.dto.TicketDetailResponse;
import com.acme.workflow.ticket.dto.TicketSummaryResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDetailResponse createTicket(@Valid @RequestBody CreateTicketRequest request) {
        return ticketService.createTicket(request);
    }

    @GetMapping("/my")
    public List<TicketSummaryResponse> getMyTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String categoryId) {
        return ticketService.getMyTickets(search, status, categoryId);
    }

    @GetMapping
    public List<TicketSummaryResponse> getAllTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String categoryId) {
        return ticketService.getAllTickets(search, status, categoryId);
    }

    @GetMapping("/{id}")
    public TicketDetailResponse getTicket(@PathVariable String id) {
        return ticketService.getTicket(id);
    }

    @PostMapping("/{id}/cancel")
    public TicketDetailResponse cancelTicket(@PathVariable String id) {
        return ticketService.cancelTicket(id);
    }
}
