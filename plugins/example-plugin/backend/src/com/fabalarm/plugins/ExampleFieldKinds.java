package com.fabalarm.plugins;

import com.fabalarm.workflow.PayloadFieldSchema;

public final class ExampleFieldKinds {

    public static PayloadFieldSchema reportReference(String label, boolean required) {
        return PayloadFieldSchema.ofKind("example-plugin:report-reference", label, required);
    }

    public static PayloadFieldSchema calibrationReference(String label, boolean required) {
        return PayloadFieldSchema.ofKind("calibration-reference", label, required);
    }

    public static PayloadFieldSchema lotDisposition(String label, boolean required) {
        return PayloadFieldSchema.ofKind("example-plugin:lot-disposition", label, required);
    }

    private ExampleFieldKinds() {}
}
