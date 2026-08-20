package com.acme.workflow.config;

import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.workflow.domain.WorkflowDefinitionEntity;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import com.acme.workflow.workflow.repository.WorkflowDefinitionRepository;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Component
public class SeedDataInitializer implements ApplicationRunner {
    private final HrmUserRepository users;
    private final WorkflowDefinitionRepository workflows;
    private final WorkflowVersionRepository versions;
    private final PasswordEncoder encoder;
    private final Jsons jsons;

    public SeedDataInitializer(HrmUserRepository users,WorkflowDefinitionRepository workflows,WorkflowVersionRepository versions, PasswordEncoder encoder, Jsons jsons) {
        this.users=users;this.workflows=workflows;this.versions=versions; this.encoder = encoder; this.jsons = jsons;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        users.findAll().stream().filter(user->user.passwordHash.startsWith("{seed}")).forEach(user->{user.passwordHash=encoder.encode(user.passwordHash.substring("{seed}".length()));users.save(user);});
        String definition = new ClassPathResource("db/seed/performance-evaluation.json")
                .getContentAsString(StandardCharsets.UTF_8);
        jsons.read(definition);
        if(workflows.existsById("6")) {
            migrateEvaluationSeed(definition);
            return;
        }
        String versionId = "VERSION-EVAL-1";
        WorkflowDefinitionEntity workflow=new WorkflowDefinitionEntity();workflow.id="6";workflow.name="Đánh giá hiệu quả công việc";
        workflow.description="Quy trình đánh giá hiệu quả công việc định kỳ: nhân viên tự đánh giá, quản lý trực tiếp đánh giá, HR kiểm tra, lưu và thông báo kết quả";
        workflow.workflowType="Review";workflow.moduleName="HR";workflow.ownerId="U000";workflow.status="PUBLISHED";workflow.draftVersion="1.0";
        workflow.draftDefinition=definition;workflow.activeVersionId=versionId;workflows.save(workflow);
        WorkflowVersionEntity version=new WorkflowVersionEntity();version.id=versionId;version.workflowId="6";version.versionNo="1.0";version.status="PUBLISHED";
        version.definitionSnapshot=definition;version.checksum=Ids.sha256(definition);version.validationReport="{\"valid\":true,\"errors\":[],\"warnings\":[]}";
        version.authorId="U000";version.publishedAt=Instant.now();versions.save(version);
    }

    private void migrateEvaluationSeed(String definition) {
        WorkflowDefinitionEntity workflow = workflows.findById("6").orElseThrow();
        if (jsons.read(workflow.draftDefinition).path("nodes").findValuesAsText("type").contains("START")) return;
        String versionId = "VERSION-EVAL-2";
        WorkflowVersionEntity version = versions.findById(versionId).orElseGet(WorkflowVersionEntity::new);
        version.id=versionId;version.workflowId="6";version.versionNo="1.1";version.status="PUBLISHED";
        version.definitionSnapshot=definition;version.checksum=Ids.sha256(definition);
        version.validationReport="{\"valid\":true,\"errors\":[],\"warnings\":[],\"runtimeCapabilityVersion\":\"2.0\"}";
        version.authorId="U000";version.publishedAt=Instant.now();versions.save(version);
        workflow.draftVersion="1.1";workflow.draftDefinition=definition;workflow.activeVersionId=versionId;workflow.status="PUBLISHED";
        workflows.save(workflow);
    }
}
