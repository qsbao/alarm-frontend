package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "workflow_instance")
public class WorkflowInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "issue_id", nullable = false, unique = true, length = 20)
    private String issueId;

    @Column(name = "definition_id", nullable = false, length = 50)
    private String definitionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private WorkflowStatus status;

    @Column(name = "completed_at")
    private Instant completedAt;

    public WorkflowInstance() {}

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getDefinitionId() { return definitionId; }
    public void setDefinitionId(String definitionId) { this.definitionId = definitionId; }

    public WorkflowStatus getStatus() { return status; }
    public void setStatus(WorkflowStatus status) { this.status = status; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
