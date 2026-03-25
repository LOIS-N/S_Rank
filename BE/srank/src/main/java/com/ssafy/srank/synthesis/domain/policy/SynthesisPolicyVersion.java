package com.ssafy.srank.synthesis.domain.policy;

public enum SynthesisPolicyVersion {
    V1("SYNTHESIS_POLICY_V1");

    private final String value;

    SynthesisPolicyVersion(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static boolean isSupported(String value) {
        for (SynthesisPolicyVersion version : values()) {
            if (version.value.equals(value)) {
                return true;
            }
        }
        return false;
    }

    public static String currentValue() {
        return V1.value;
    }
}
