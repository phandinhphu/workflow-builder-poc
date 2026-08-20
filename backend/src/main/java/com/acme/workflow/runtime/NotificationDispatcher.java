package com.acme.workflow.runtime;

import com.acme.workflow.common.Jsons;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.integration.IntegrationService;
import com.acme.workflow.integration.repository.ConnectorRepository;
import com.acme.workflow.runtime.domain.NotificationDeliveryEntity;
import com.acme.workflow.runtime.repository.NotificationDeliveryRepository;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Component
public class NotificationDispatcher {
    private final NotificationDeliveryRepository notices;
    private final HrmUserRepository users;
    private final ConnectorRepository connectors;
    private final IntegrationService integrations;
    private final ObjectProvider<JavaMailSender> mailSender;
    private final Jsons jsons;

    public NotificationDispatcher(NotificationDeliveryRepository notices,HrmUserRepository users,ConnectorRepository connectors,
                                  IntegrationService integrations,ObjectProvider<JavaMailSender> mailSender,Jsons jsons){
        this.notices=notices;this.users=users;this.connectors=connectors;this.integrations=integrations;this.mailSender=mailSender;this.jsons=jsons;
    }

    @Scheduled(fixedDelayString = "${app.runtime.notification-delay-ms:5000}")
    @Transactional
    public void dispatch(){notices.findTop100ByDeliveryStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(List.of("PENDING","RETRY"),Instant.now()).forEach(this::deliver);}

    private void deliver(NotificationDeliveryEntity notice){notice.attempts++;try{
        String providerId=switch(notice.channel.toLowerCase(Locale.ROOT)){
            case"email"->email(notice);
            case"teams","webhook"->webhook(notice);
            default->throw new IllegalStateException("Notification channel không hỗ trợ: "+notice.channel);
        };
        notice.deliveryStatus="SENT";notice.sentAt=Instant.now();notice.providerMessageId=providerId;notice.lastError=null;notice.nextAttemptAt=null;
    }catch(RuntimeException error){notice.lastError=String.valueOf(error.getMessage());if(notice.attempts>=5){notice.deliveryStatus="FAILED";notice.nextAttemptAt=null;}else{notice.deliveryStatus="RETRY";notice.nextAttemptAt=Instant.now().plusSeconds(Math.min(300,(long)Math.pow(2,notice.attempts)));}}notices.save(notice);}

    private String email(NotificationDeliveryEntity notice){JavaMailSender sender=mailSender.getIfAvailable();if(sender==null)throw new IllegalStateException("Email provider chưa cấu hình");String address=users.findById(notice.recipientId).orElseThrow().email;SimpleMailMessage message=new SimpleMailMessage();message.setTo(address);message.setSubject(notice.titleText);message.setText(notice.bodyText);sender.send(message);return"smtp:"+notice.id;}
    private String webhook(NotificationDeliveryEntity notice){String key="teams".equalsIgnoreCase(notice.channel)?"TEAMS_NOTIFICATION":"WEBHOOK_NOTIFICATION";var connector=connectors.findByConnectorKey(key).orElseThrow(()->new IllegalStateException("Connector "+key+" chưa cấu hình"));ObjectNode config=jsons.object(connector.configuration);ObjectNode body=jsons.object().put("title",notice.titleText).put("text",notice.bodyText).put("recipientId",notice.recipientId);return integrations.execute(connector.id,"POST",config.path("path").asText(""),jsons.object(),body,config.path("credentialId").asText(null),notice.dedupKey).path("statusCode").asText();}
}
