package com.fabalarm.workflow;

import com.fabalarm.model.IssueStatus;
import com.fabalarm.model.RiskLevel;

import java.util.List;
import java.util.Map;

public final class GenericLinearDefinition {

    public static final WorkflowDefinition INSTANCE = new WorkflowDefinition(
            "generic_linear_v1",
            "Generic Linear",
            "1",
            List.of(
                    StepDefinition.builder("chart_owner_comment", "Chart Owner Comment", 1)
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("resolved", "Resolved", 2)
                            .preSteps("chart_owner_comment")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "comment", PayloadFieldSchema.text("Comment", false, null)
                            ))
                            .impliesStatus(IssueStatus.Resolved)
                            .build(),
                    StepDefinition.builder("closed", "Closed", 3)
                            .preSteps("resolved")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "comment", PayloadFieldSchema.text("Comment", false, null)
                            ))
                            .impliesStatus(IssueStatus.Closed)
                            .build()
            )
    );

    private GenericLinearDefinition() {}
}
