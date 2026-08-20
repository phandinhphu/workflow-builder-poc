package com.acme.workflow.runtime;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.runtime.domain.NotificationDeliveryEntity;
import com.acme.workflow.runtime.repository.NotificationDeliveryRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationDeliveryRepository notices;private final CurrentUserService current;
    public NotificationController(NotificationDeliveryRepository notices,CurrentUserService current){this.notices=notices;this.current=current;}
    @GetMapping List<Map<String,Object>> list(){return notices.findByRecipientIdOrderByCreatedAtDesc(current.id()).stream().map(this::map).toList();}
    @PostMapping("/{id}/read") @Transactional Map<String,Object> read(@PathVariable String id){NotificationDeliveryEntity notice=notices.findById(id).orElseThrow(()->ApiException.notFound("Không tìm thấy notification"));if(!current.id().equals(notice.recipientId))throw ApiException.forbidden("Notification không thuộc người dùng hiện tại");notice.readAt=Instant.now();notices.save(notice);return map(notice);}
    private Map<String,Object> map(NotificationDeliveryEntity n){Map<String,Object> result=new LinkedHashMap<>();result.put("id",n.id);result.put("instanceId",n.instanceId);result.put("taskId",n.taskId);result.put("channel",n.channel);result.put("title",n.titleText);result.put("body",n.bodyText);result.put("status",n.deliveryStatus);result.put("createdAt",n.createdAt);result.put("sentAt",n.sentAt);result.put("readAt",n.readAt);return result;}
}
