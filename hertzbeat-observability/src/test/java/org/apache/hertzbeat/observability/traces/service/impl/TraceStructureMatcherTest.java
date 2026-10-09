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

package org.apache.hertzbeat.observability.traces.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.junit.jupiter.api.Test;

class TraceStructureMatcherTest {

    @Test
    void evaluatesObservedDistinctSpanAndParentRelationships() {
        var root = span("1111222233334444", null, "checkout", "POST /checkout", "UNSET");
        var child = span("5555666677778888", root.getSpanId(), "cart", "SELECT cart_items", "ERROR");
        var grandchild = span("9999aaaabbbbcccc", child.getSpanId(), "database", "query", "UNSET");
        var spans = List.of(root, child, grandchild);
        var checkout = new TraceStructureQuery.Clause("checkout", "POST /checkout", null);
        var cartError = new TraceStructureQuery.Clause("cart", null, "ERROR");
        var database = new TraceStructureQuery.Clause("database", null, null);

        assertTrue(TraceStructureMatcher.matches(spans, checkout, cartError, TraceStructureQuery.Relation.BOTH));
        assertTrue(TraceStructureMatcher.matches(spans, checkout, cartError, TraceStructureQuery.Relation.DIRECT));
        assertTrue(TraceStructureMatcher.matches(spans, checkout, database, TraceStructureQuery.Relation.UPSTREAM));
        assertFalse(TraceStructureMatcher.matches(spans, checkout, database, TraceStructureQuery.Relation.DIRECT));
        assertFalse(TraceStructureMatcher.matches(spans, cartError, checkout, TraceStructureQuery.Relation.UPSTREAM));
        assertTrue(TraceStructureMatcher.matches(spans, checkout, database, TraceStructureQuery.Relation.EITHER));
        assertFalse(TraceStructureMatcher.matches(List.of(root), checkout, checkout, TraceStructureQuery.Relation.BOTH));
    }

    @Test
    void neverInventsPathThroughUnobservedParent() {
        var orphan = span("5555666677778888", "aaaaaaaaaaaaaaaa", "cart", "SELECT cart_items", "ERROR");
        var root = span("1111222233334444", null, "checkout", "POST /checkout", "UNSET");
        assertFalse(TraceStructureMatcher.matches(List.of(root, orphan),
                new TraceStructureQuery.Clause("checkout", null, null),
                new TraceStructureQuery.Clause("cart", null, null), TraceStructureQuery.Relation.UPSTREAM));
    }

    private static TraceSpanNodeDto span(String id, String parentId, String service, String operation, String status) {
        var span = new TraceSpanNodeDto();
        span.setTraceId("0123456789abcdef0123456789abcdef");
        span.setSpanId(id);
        span.setParentSpanId(parentId);
        span.setServiceName(service);
        span.setSpanName(operation);
        span.setStatus(status);
        span.setResourceAttributes(Map.of());
        span.setSpanAttributes(Map.of());
        return span;
    }
}
