package com.fabalarm.plugins;

import com.fabalarm.model.IssueStatus;
import com.fabalarm.workflow.PayloadFieldSchema;
import com.fabalarm.workflow.StepDefinition;
import com.fabalarm.workflow.WorkflowDefinition;

import java.util.List;
import java.util.Map;

public final class ExampleLinearDefinition {

    public static final WorkflowDefinition INSTANCE = new WorkflowDefinition(
            "example_linear_v1",
            "Example Linear (Plugin)",
            "1",
            List.of(
                    StepDefinition.builder("start", "Start", 1)
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("analyze", "Analyze", 2)
                            .preSteps("start")
                            .payloadSchema(Map.of(
                                    "analysis", PayloadFieldSchema.text("Analysis", true, 5)
                            ))
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("resolve", "Resolve", 3)
                            .preSteps("analyze")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "resolution", PayloadFieldSchema.text("Resolution", true, null)
                            ))
                            .impliesStatus(IssueStatus.Resolved)
                            .build()
            )
    );

    private ExampleLinearDefinition() {}
}
