package com.fabalarm.repository;

import com.fabalarm.model.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Long> {
    List<WorkflowStep> findByInstanceId(Long instanceId);
    Optional<WorkflowStep> findByInstanceIdAndStepId(Long instanceId, String stepId);
}
