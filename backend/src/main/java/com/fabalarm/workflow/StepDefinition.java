package com.fabalarm.workflow;

import com.fabalarm.model.Issue;
import com.fabalarm.model.IssueStatus;

import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.function.Predicate;

public class StepDefinition {

    private final String id;
    private final String label;
    private final int order;
    private final List<String> preSteps;
    private final BiPredicate<String, Issue> gate; // (userId, issue) -> allowed
    private final Map<String, PayloadFieldSchema> payloadSchema;
    private final IssueStatus impliesStatus;
    private final Predicate<Issue> defaultSkipIf;
    private final Predicate<Issue> skippableIf;

    private StepDefinition(Builder builder) {
        this.id = builder.id;
        this.label = builder.label;
        this.order = builder.order;
        this.preSteps = builder.preSteps != null ? List.copyOf(builder.preSteps) : List.of();
        this.gate = builder.gate;
        this.payloadSchema = builder.payloadSchema;
        this.impliesStatus = builder.impliesStatus;
        this.defaultSkipIf = builder.defaultSkipIf;
        this.skippableIf = builder.skippableIf;
    }

    public String getId() { return id; }
    public String getLabel() { return label; }
    public int getOrder() { return order; }
    public List<String> getPreSteps() { return preSteps; }
    public BiPredicate<String, Issue> getGate() { return gate; }
    public Map<String, PayloadFieldSchema> getPayloadSchema() { return payloadSchema; }
    public IssueStatus getImpliesStatus() { return impliesStatus; }
    public Predicate<Issue> getDefaultSkipIf() { return defaultSkipIf; }
    public Predicate<Issue> getSkippableIf() { return skippableIf; }

    public static Builder builder(String id, String label, int order) {
        return new Builder(id, label, order);
    }

    public static class Builder {
        private final String id;
        private final String label;
        private final int order;
        private List<String> preSteps;
        private BiPredicate<String, Issue> gate;
        private Map<String, PayloadFieldSchema> payloadSchema;
        private IssueStatus impliesStatus;
        private Predicate<Issue> defaultSkipIf;
        private Predicate<Issue> skippableIf;

        private Builder(String id, String label, int order) {
            this.id = id;
            this.label = label;
            this.order = order;
        }

        public Builder preSteps(String... preSteps) {
            this.preSteps = List.of(preSteps);
            return this;
        }

        public Builder gate(BiPredicate<String, Issue> gate) {
            this.gate = gate;
            return this;
        }

        public Builder payloadSchema(Map<String, PayloadFieldSchema> schema) {
            this.payloadSchema = schema;
            return this;
        }

        public Builder impliesStatus(IssueStatus status) {
            this.impliesStatus = status;
            return this;
        }

        public Builder defaultSkipIf(Predicate<Issue> predicate) {
            this.defaultSkipIf = predicate;
            return this;
        }

        public Builder skippableIf(Predicate<Issue> predicate) {
            this.skippableIf = predicate;
            return this;
        }

        public StepDefinition build() {
            return new StepDefinition(this);
        }
    }
}
