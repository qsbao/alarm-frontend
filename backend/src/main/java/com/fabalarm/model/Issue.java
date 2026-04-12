package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "issue")
public class Issue {

    @Id
    @Column(length = 20)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "issue_date", nullable = false)
    private Instant date;

    @Enumerated(EnumType.STRING)
    @Column(name = "alarm_type", nullable = false, length = 20)
    private AlarmType alarmType;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 10)
    private RiskLevel riskLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private IssueStatus status;

    @Column(name = "issue_time", nullable = false)
    private Instant issueTime;

    @Column(nullable = false, length = 40)
    private String operation;

    @Column(nullable = false, length = 20)
    private String product;

    @Column(name = "owner_id", nullable = false, length = 50)
    private String ownerId;

    @Column(nullable = false, length = 50)
    private String department;

    @Column(length = 2000)
    private String description;

    @Column(name = "merged_into_issue_id", length = 20)
    private String mergedIntoIssueId;

    public Issue() {}

    // Getters and setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Instant getDate() { return date; }
    public void setDate(Instant date) { this.date = date; }

    public AlarmType getAlarmType() { return alarmType; }
    public void setAlarmType(AlarmType alarmType) { this.alarmType = alarmType; }

    public RiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(RiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public IssueStatus getStatus() { return status; }
    public void setStatus(IssueStatus status) { this.status = status; }

    public Instant getIssueTime() { return issueTime; }
    public void setIssueTime(Instant issueTime) { this.issueTime = issueTime; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getMergedIntoIssueId() { return mergedIntoIssueId; }
    public void setMergedIntoIssueId(String mergedIntoIssueId) { this.mergedIntoIssueId = mergedIntoIssueId; }
}
