/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

package org.apache.hertzbeat.common.observability.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class LogCalculatedExtractionTest {

    @Test
    void acceptsUnderscoresWithinBoundedCaptureNames() {
        var compiled = LogCalculatedExtraction.compile("grok", "^%{notSpace:audit_token}$");

        assertEquals("audit_token", compiled.groups().getFirst().name());
        assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedExtraction.compile("grok", "^%{notSpace:9audit_token}$"));
        assertThrows(LogCalculatedFormula.ValidationException.class,
                () -> LogCalculatedExtraction.compile("grok", "^%{notSpace:a" + "x".repeat(64) + "}$"));
    }
}
