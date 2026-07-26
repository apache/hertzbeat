/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Verifies input parsing and hierarchy-data tolerance in the AI alert rule utilities.
 */
class UtilityClassTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "cpu_usage >= 80",
        "cpu_usage <= 80",
        "cpu_usage == 80",
        "cpu_usage != 80"
    })
    void validateExpressionSyntaxShouldAcceptSupportedComparisonOperators(String expression) {
        assertEquals("VALID", UtilityClass.validateExpressionSyntax(expression));
    }

    @Test
    void validateExpressionSyntaxShouldNotTreatLogicalTextInsideFieldNameAsOperator() {
        assertEquals("VALID", UtilityClass.validateExpressionSyntax("processor_count > 1"));
    }

    @Test
    void validateExpressionSyntaxShouldStillRejectSingleEquals() {
        assertEquals("Error: Use '==' for equality comparison, not '='",
                UtilityClass.validateExpressionSyntax("cpu_usage = 80"));
    }

    @Test
    void parseKeyValuePairsShouldPreserveColonsInValue() {
        Map<String, String> result = UtilityClass.parseKeyValuePairs(
                "runbook:https://example.org:8443/alerts, severity:critical");

        assertEquals("https://example.org:8443/alerts", result.get("runbook"));
        assertEquals("critical", result.get("severity"));
    }

    @Test
    void extractFieldNamesShouldHandleFunctionsAndComparisons() {
        List<String> fields = UtilityClass.extractFieldNamesFromConditions(
                "equals(VmName, \"prod\") and contains(host, \"db\") "
                        + "and (cpu_usage >= 80 or cpu_usage <= 20)");

        assertEquals(List.of("VmName", "host", "cpu_usage"), fields);
    }

    @Test
    void extractFieldNamesShouldIgnoreComparisonTextInsideQuotedValue() {
        List<String> fields = UtilityClass.extractFieldNamesFromConditions(
                "equals(message, \"fake_field > 1\")");

        assertEquals(List.of("message"), fields);
    }

    @Test
    void formatHierarchyAsJsonShouldAcceptNonLeafWithoutChildren() {
        Hierarchy hierarchy = new Hierarchy();
        hierarchy.setValue("linux");
        hierarchy.setLabel("Linux");
        hierarchy.setIsLeaf(false);

        ObjectNode result = UtilityClass.formatHierarchyAsJson(new ObjectMapper(), hierarchy);

        assertEquals("app", result.get("type").asText());
        assertFalse(result.has("children"));
        assertTrue(result.has("value"));
    }
}
