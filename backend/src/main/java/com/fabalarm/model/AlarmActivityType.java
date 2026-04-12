package com.fabalarm.model;

public enum AlarmActivityType {
    created,
    acked,
    acked_via_issue,
    recovered,
    linked,
    unlinked,
    label_added,
    label_removed,
    risk_changed,
    moved_between_issues,
    merged_to_issue
}
