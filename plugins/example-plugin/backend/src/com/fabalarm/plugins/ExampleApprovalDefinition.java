package com.fabalarm.plugins;

import com.fabalarm.model.IssueStatus;
import com.fabalarm.workflow.PayloadFieldSchema;
import com.fabalarm.workflow.StepDefinition;
import com.fabalarm.workflow.WorkflowDefinition;

import java.util.List;
import java.util.Map;

public final class ExampleApprovalDefinition {

    public static final WorkflowDefinition INSTANCE = new WorkflowDefinition(
            "example_approval_v1",
            "Example Approval (Plugin)",
            "1",
            List.of(
                    StepDefinition.builder("submit", "Submit Request", 1)
                            .payloadSchema(Map.of(
                                    "description", PayloadFieldSchema.text("Description", true, 10)
                            ))
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("review", "Review", 2)
                            .preSteps("submit")
                            .gate((userId, issue) -> !userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "decision", PayloadFieldSchema.enumField("Decision", true, List.of("Approve", "Reject")),
                                    "comment", PayloadFieldSchema.text("Review Comment", false, null)
                            ))
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("closed", "Close", 3)
                            .preSteps("review")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .impliesStatus(IssueStatus.Closed)
                            .build()
            )
    );

    private ExampleApprovalDefinition() {}
}
