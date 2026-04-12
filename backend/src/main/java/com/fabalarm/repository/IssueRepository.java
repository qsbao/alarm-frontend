package com.fabalarm.repository;

import com.fabalarm.model.Issue;
import com.fabalarm.model.IssueStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, String> {
    List<Issue> findByDepartmentAndStatusAndIdNot(String department, IssueStatus status, String excludeId);
    List<Issue> findByDepartmentAndStatusNotAndIdNotIn(String department, IssueStatus status, List<String> excludeIds);
}
