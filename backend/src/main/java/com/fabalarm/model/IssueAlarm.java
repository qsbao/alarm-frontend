package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "issue_alarm")
public class IssueAlarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "issue_id", nullable = false, length = 20)
    private String issueId;

    @Column(name = "alarm_id", nullable = false, length = 20)
    private String alarmId;

    @Column(name = "attached_at", nullable = false)
    private Instant attachedAt;

    @Column(name = "attached_by", nullable = false, length = 100)
    private String attachedBy;

    @Column(name = "merged_at")
    private Instant mergedAt;

    @Column(name = "merged_by", length = 100)
    private String mergedBy;

    @Column(name = "merged_to_issue_id", length = 20)
    private String mergedToIssueId;

    public IssueAlarm() {}

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getAlarmId() { return alarmId; }
    public void setAlarmId(String alarmId) { this.alarmId = alarmId; }

    public Instant getAttachedAt() { return attachedAt; }
    public void setAttachedAt(Instant attachedAt) { this.attachedAt = attachedAt; }

    public String getAttachedBy() { return attachedBy; }
    public void setAttachedBy(String attachedBy) { this.attachedBy = attachedBy; }

    public Instant getMergedAt() { return mergedAt; }
    public void setMergedAt(Instant mergedAt) { this.mergedAt = mergedAt; }

    public String getMergedBy() { return mergedBy; }
    public void setMergedBy(String mergedBy) { this.mergedBy = mergedBy; }

    public String getMergedToIssueId() { return mergedToIssueId; }
    public void setMergedToIssueId(String mergedToIssueId) { this.mergedToIssueId = mergedToIssueId; }
}
