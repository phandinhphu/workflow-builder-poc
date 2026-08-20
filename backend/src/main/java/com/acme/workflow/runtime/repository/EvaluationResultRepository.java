package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.EvaluationResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface EvaluationResultRepository extends JpaRepository<EvaluationResultEntity,String>{List<EvaluationResultEntity>findByPeriodKeyAndParticipantUserId(String period,String userId);List<EvaluationResultEntity>findByPeriodKey(String period);List<EvaluationResultEntity>findByParticipantUserId(String userId);}
