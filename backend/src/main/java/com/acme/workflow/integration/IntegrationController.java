package com.acme.workflow.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class IntegrationController {
    private final IntegrationService service;
    public IntegrationController(IntegrationService service) { this.service = service; }
    @GetMapping("/connectors") List<Map<String, Object>> connectors() { return service.connectors(); }
    @PostMapping("/connectors") Map<String, Object> createConnector(@RequestBody ObjectNode body) { return service.saveConnector(null, body); }
    @PutMapping("/connectors/{id}") Map<String, Object> updateConnector(@PathVariable String id, @RequestBody ObjectNode body) { return service.saveConnector(id, body); }
    @GetMapping("/credential-references") List<Map<String, Object>> credentials() { return service.credentials(); }
    @PostMapping("/credential-references") Map<String, Object> createCredential(@RequestBody ObjectNode body) { return service.saveCredential(null, body); }
    @PutMapping("/credential-references/{id}") Map<String, Object> updateCredential(@PathVariable String id, @RequestBody ObjectNode body) { return service.saveCredential(id, body); }
}
