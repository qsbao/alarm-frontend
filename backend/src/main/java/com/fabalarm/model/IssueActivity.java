package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "issue_activity")
public class IssueActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "issue_id", nullable = false, length = 20)
    private String issueId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private IssueActivityType type;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(nullable = false, length = 100)
    private String author;

    @Column(length = 2000)
    private String text;

    @Column(name = "assigned_to", length = 50)
    private String assignedTo;

    @Column(name = "alarm_id", length = 20)
    private String alarmId;

    @Column(name = "blocker_issue_id", length = 20)
    private String blockerIssueId;

    @Column(name = "workflow_definition_id", length = 50)
    private String workflowDefinitionId;

    @Column(name = "workflow_step_id", length = 50)
    private String workflowStepId;

    @Column(name = "workflow_action", length = 20)
    private String workflowAction;

    @Column(name = "workflow_actor_id", length = 50)
    private String workflowActorId;

    public IssueActivity() {}

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public IssueActivityType getType() { return type; }
    public void setType(IssueActivityType type) { this.type = type; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public String getAlarmId() { return alarmId; }
    public void setAlarmId(String alarmId) { this.alarmId = alarmId; }

    public String getBlockerIssueId() { return blockerIssueId; }
    public void setBlockerIssueId(String blockerIssueId) { this.blockerIssueId = blockerIssueId; }

    public String getWorkflowDefinitionId() { return workflowDefinitionId; }
    public void setWorkflowDefinitionId(String workflowDefinitionId) { this.workflowDefinitionId = workflowDefinitionId; }

    public String getWorkflowStepId() { return workflowStepId; }
    public void setWorkflowStepId(String workflowStepId) { this.workflowStepId = workflowStepId; }

    public String getWorkflowAction() { return workflowAction; }
    public void setWorkflowAction(String workflowAction) { this.workflowAction = workflowAction; }

    public String getWorkflowActorId() { return workflowActorId; }
    public void setWorkflowActorId(String workflowActorId) { this.workflowActorId = workflowActorId; }
}
