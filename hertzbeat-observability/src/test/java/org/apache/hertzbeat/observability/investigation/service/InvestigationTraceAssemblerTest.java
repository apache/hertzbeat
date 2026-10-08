/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.investigation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.TraceSpanRow;
import org.junit.jupiter.api.Test;

class InvestigationTraceAssemblerTest {
    private static final String TRACE = "0123456789abcdef0123456789abcdef";
    private static final String FIRST = "1111111111111111";
    private static final String SECOND = "2222222222222222";
    private static final String ABSENT = "3333333333333333";

    @Test
    void preservesMissingParentForestWithoutInventingRootOrEdges() {
        var result = InvestigationTraceAssembler.assemble(TRACE, null,
                List.of(row(FIRST, ABSENT, 1000, 1001, "checkout"), row(SECOND, null, 1001, 0, null)));
        assertEquals(2, result.detail().spans().size());
        assertEquals(ABSENT, result.detail().spans().getFirst().parentSpanId());
        assertEquals(SECOND, result.detail().rootSpanId());
        assertEquals(List.of(), result.dependencies());
    }

    @Test
    void acceptsRootlessAndAmbiguousEvidenceWithoutPromotingChild() {
        var missing = InvestigationTraceAssembler.assemble(TRACE, null,
                List.of(row(SECOND, ABSENT, 1001, 10, "checkout"), row(FIRST, ABSENT, 1000, 20, "checkout")));
        assertNull(missing.detail().rootSpanId());
        assertNull(missing.detail().durationNanos());
        var ambiguous = InvestigationTraceAssembler.assemble(TRACE, null,
                List.of(row(SECOND, null, 1000, 10, "checkout"), row(FIRST, null, 1000, 20, "checkout")));
        assertNull(ambiguous.detail().rootSpanId());
    }

    @Test
    void representativeUsesExactNanosecondOrderBeforeSpanIdTieBreak() {
        var later = new TraceSpanRow(1000L, 1_000_900_000L, 1002L, TRACE, FIRST, ABSENT,
                "later", "checkout", "UNSET", null, "INTERNAL", null, null, null, 500_000L,
                "default", null, null, null, null, Map.of(), Map.of(), List.of(), List.of(), null);
        var earlier = new TraceSpanRow(1000L, 1_000_100_000L, 1002L, TRACE, SECOND, ABSENT,
                "earlier", "checkout", "UNSET", null, "INTERNAL", null, null, null, 1_000_000L,
                "default", null, null, null, null, Map.of(), Map.of(), List.of(), List.of(), null);
        var detail = InvestigationTraceAssembler.assemble(TRACE, null, List.of(later, earlier)).detail();
        assertEquals(SECOND, detail.representativeSpan().spanId());
        assertEquals(1000L, detail.observedStartTime());
        assertEquals(1002L, detail.observedEndTime());
        assertEquals("1000100000", detail.spans().stream().filter(span -> SECOND.equals(span.spanId()))
                .findFirst().orElseThrow().startTimeUnixNano());
        assertEquals("1000900000", detail.spans().stream().filter(span -> FIRST.equals(span.spanId()))
                .findFirst().orElseThrow().startTimeUnixNano());
        assertNull(detail.rootSpanId());
    }

    @Test
    void partialAssemblyKeepsObservedRootAndMarksSampleIncomplete() {
        var result = InvestigationTraceAssembler.assemble(TRACE, FIRST,
                List.of(row(FIRST, null, 1000, 1, "checkout")), true);

        assertEquals(FIRST, result.detail().rootSpanId());
        assertEquals("unique", result.detail().rootState());
        assertTrue(result.detail().partial());
        assertEquals(FIRST, result.selectedSpanId());
    }

    @Test
    void rejectsCyclesEvenWhenDisconnectedFromTheUniqueRoot() {
        List<TraceSpanRow> rows = List.of(row(ABSENT, null, 1000, 1, "a"),
                row(FIRST, SECOND, 1000, 1, "a"), row(SECOND, FIRST, 1000, 1, "a"));
        assertThrows(InvestigationTraceAssembler.MalformedTraceException.class,
                () -> InvestigationTraceAssembler.assemble(TRACE, null, rows));
        assertThrows(InvestigationTraceAssembler.MalformedTraceException.class,
                () -> InvestigationTraceAssembler.assemble(TRACE, null, rows, true));
    }

    @Test
    void rejectsDuplicateInvalidAndSelfParentIdentifiers() {
        var valid = row(FIRST, null, 1000, 1, "a");
        for (var rows : List.of(List.of(valid, valid), List.of(row("bad", null, 1000, 1, "a")),
                List.of(row(FIRST, FIRST, 1000, 1, "a")), List.of(row(FIRST, "bad", 1000, 1, "a")))) {
            assertThrows(InvestigationTraceAssembler.MalformedTraceException.class,
                    () -> InvestigationTraceAssembler.assemble(TRACE, null, rows));
            assertThrows(InvestigationTraceAssembler.MalformedTraceException.class,
                    () -> InvestigationTraceAssembler.assemble(TRACE, null, rows, true));
        }
    }

    @Test
    void rejectsUnsafeTimestampsAndDurationsAndUnknownSelections() {
        for (var invalid : List.of(row(FIRST, null, -1, 1, "a"), row(FIRST, null, 1000, -1, "a"),
                row(FIRST, null, Long.MAX_VALUE, 1, "a"), row(FIRST, null, 1000, Long.MAX_VALUE, "a"))) {
            assertThrows(InvestigationTraceAssembler.MalformedTraceException.class,
                    () -> InvestigationTraceAssembler.assemble(TRACE, null, List.of(invalid)));
        }
        assertThrows(ObservabilityQueryRequestException.class, () -> InvestigationTraceAssembler.assemble(
                TRACE, ABSENT, List.of(row(FIRST, null, 1000, 1, "a"))));
    }

    private static TraceSpanRow row(String id, String parent, long start, long duration, String service) {
        return new TraceSpanRow(start, start * 1_000_000L, start + 1, TRACE, id, parent,
                service == null ? null : "operation", service, "UNSET",
                null, "INTERNAL", null, null, null, duration, "default", null, null, null, null,
                Map.of(), Map.of(), List.of(), List.of(), null);
    }
}
