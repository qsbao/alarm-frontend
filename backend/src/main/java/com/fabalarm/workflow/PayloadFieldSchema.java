package com.fabalarm.workflow;

import java.util.List;

public class PayloadFieldSchema {

    private final String kind; // "enum", "text", "report-reference", "calibration-reference", "lot-disposition"
    private final String label;
    private final boolean required;
    private final List<String> options; // for enum kind
    private final Integer minLength; // for text kind

    public PayloadFieldSchema(String kind, String label, boolean required,
                              List<String> options, Integer minLength) {
        this.kind = kind;
        this.label = label;
        this.required = required;
        this.options = options;
        this.minLength = minLength;
    }

    public static PayloadFieldSchema text(String label, boolean required, Integer minLength) {
        return new PayloadFieldSchema("text", label, required, null, minLength);
    }

    public static PayloadFieldSchema enumField(String label, boolean required, List<String> options) {
        return new PayloadFieldSchema("enum", label, required, options, null);
    }

    public static PayloadFieldSchema reportReference(String label, boolean required) {
        return new PayloadFieldSchema("report-reference", label, required, null, null);
    }

    public static PayloadFieldSchema calibrationReference(String label, boolean required) {
        return new PayloadFieldSchema("calibration-reference", label, required, null, null);
    }

    public static PayloadFieldSchema lotDisposition(String label, boolean required) {
        return new PayloadFieldSchema("lot-disposition", label, required, null, null);
    }

    public String getKind() { return kind; }
    public String getLabel() { return label; }
    public boolean isRequired() { return required; }
    public List<String> getOptions() { return options; }
    public Integer getMinLength() { return minLength; }
}
