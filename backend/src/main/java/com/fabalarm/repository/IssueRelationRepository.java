package com.fabalarm.repository;

import com.fabalarm.model.IssueRelation;
import com.fabalarm.model.IssueRelationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IssueRelationRepository extends JpaRepository<IssueRelation, Long> {
    List<IssueRelation> findByFromIssueIdAndType(String fromIssueId, IssueRelationType type);

    Optional<IssueRelation> findByFromIssueIdAndToIssueIdAndType(
            String fromIssueId, String toIssueId, IssueRelationType type);

    void deleteByFromIssueIdAndToIssueIdAndType(
            String fromIssueId, String toIssueId, IssueRelationType type);
}
