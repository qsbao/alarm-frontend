package com.fabalarm.workflow;

import com.fabalarm.model.IssueStatus;
import com.fabalarm.model.RiskLevel;

import java.util.List;
import java.util.Map;

public final class SpcOocBranchingDefinition {

    public static final WorkflowDefinition INSTANCE = new WorkflowDefinition(
            "spc_ooc_branching_v1",
            "SPC OOC Branching",
            "1",
            List.of(
                    StepDefinition.builder("chart_owner_comment", "Chart Owner Comment", 1)
                            .impliesStatus(IssueStatus.Investigating)
                            .build(),
                    StepDefinition.builder("l5_review", "L5 Review", 2)
                            .preSteps("chart_owner_comment")
                            .build(),
                    StepDefinition.builder("l4_review", "L4 Review", 3)
                            .preSteps("l5_review")
                            .build(),
                    StepDefinition.builder("pi_comment", "PI Comment", 4)
                            .preSteps("chart_owner_comment")
                            .build(),
                    StepDefinition.builder("attach_report", "Attach Investigation Report", 5)
                            .preSteps("chart_owner_comment")
                            .skippableIf(issue -> true)
                            .payloadSchema(Map.of(
                                    "reportId", PayloadFieldSchema.reportReference("Report ID", false)
                            ))
                            .build(),
                    StepDefinition.builder("verify_calibration", "Verify Equipment Calibration", 6)
                            .preSteps("chart_owner_comment")
                            .skippableIf(issue -> true)
                            .payloadSchema(Map.of(
                                    "calibrationId", PayloadFieldSchema.calibrationReference("Calibration ID", false)
                            ))
                            .build(),
                    StepDefinition.builder("meeting", "Meeting", 7)
                            .preSteps("l4_review", "pi_comment", "attach_report", "verify_calibration")
                            .skippableIf(issue -> issue.getRiskLevel() == RiskLevel.Low)
                            .build(),
                    StepDefinition.builder("resolved", "Resolved", 8)
                            .preSteps("meeting")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "comment", PayloadFieldSchema.text("Comment", false, null)
                            ))
                            .impliesStatus(IssueStatus.Resolved)
                            .build(),
                    StepDefinition.builder("closed", "Closed", 9)
                            .preSteps("resolved")
                            .gate((userId, issue) -> userId.equals(issue.getOwnerId()))
                            .payloadSchema(Map.of(
                                    "comment", PayloadFieldSchema.text("Comment", false, null)
                            ))
                            .impliesStatus(IssueStatus.Closed)
                            .build()
            )
    );

    private SpcOocBranchingDefinition() {}
}
