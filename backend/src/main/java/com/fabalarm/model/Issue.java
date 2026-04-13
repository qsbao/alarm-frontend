package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

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
    @Column(name = "risk_level", nullable = false, length = 11)
    private HumanRiskLevel riskLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private IssueStatus status;

    @Column(name = "issue_time", nullable = false)
    private Instant issueTime;

    @Column(name = "oper_name", length = 40)
    private String operName;

    @Column(name = "oper_no", length = 20)
    private String operNo;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Module module;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "issue_label", joinColumns = @JoinColumn(name = "issue_id"))
    @Column(name = "label")
    @Enumerated(EnumType.STRING)
    private Set<AlarmLabel> labels = new HashSet<>();

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

    public HumanRiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(HumanRiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public IssueStatus getStatus() { return status; }
    public void setStatus(IssueStatus status) { this.status = status; }

    public Instant getIssueTime() { return issueTime; }
    public void setIssueTime(Instant issueTime) { this.issueTime = issueTime; }

    public String getOperName() { return operName; }
    public void setOperName(String operName) { this.operName = operName; }

    public String getOperNo() { return operNo; }
    public void setOperNo(String operNo) { this.operNo = operNo; }

    public Module getModule() { return module; }
    public void setModule(Module module) { this.module = module; }

    public Set<AlarmLabel> getLabels() { return labels; }
    public void setLabels(Set<AlarmLabel> labels) { this.labels = labels; }

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
