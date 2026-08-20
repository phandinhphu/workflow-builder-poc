package com.acme.workflow.runtime;

import com.acme.workflow.runtime.repository.RuntimeJobRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;

@Component
public class RuntimeJobScheduler {
    private final RuntimeJobRepository jobs;
    private final RuntimeEngineService engine;
    public RuntimeJobScheduler(RuntimeJobRepository jobs, RuntimeEngineService engine) { this.jobs=jobs; this.engine=engine; }

    @Scheduled(fixedDelayString = "${app.runtime.scheduler-delay-ms:5000}")
    public void dispatch() {
        jobs.findTop100ByStateAndDueAtLessThanEqualOrderByDueAtAsc("PENDING", Instant.now()).forEach(job -> {
            try { engine.handleJob(job.id); } catch (RuntimeException ignored) { /* handleJob persists retry state */ }
        });
    }
}
