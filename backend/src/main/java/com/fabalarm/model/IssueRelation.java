package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "issue_relation")
public class IssueRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_issue_id", nullable = false, length = 20)
    private String fromIssueId;

    @Column(name = "to_issue_id", nullable = false, length = 20)
    private String toIssueId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private IssueRelationType type;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public IssueRelation() {}

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFromIssueId() { return fromIssueId; }
    public void setFromIssueId(String fromIssueId) { this.fromIssueId = fromIssueId; }

    public String getToIssueId() { return toIssueId; }
    public void setToIssueId(String toIssueId) { this.toIssueId = toIssueId; }

    public IssueRelationType getType() { return type; }
    public void setType(IssueRelationType type) { this.type = type; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
