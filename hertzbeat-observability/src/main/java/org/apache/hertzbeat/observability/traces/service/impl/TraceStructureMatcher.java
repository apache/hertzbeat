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

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;

/** Evaluates positive relationships only over span identities actually returned by storage. */
final class TraceStructureMatcher {

    private TraceStructureMatcher() { }

    static boolean matches(List<TraceSpanNodeDto> spans, TraceStructureQuery.Clause left,
                           TraceStructureQuery.Clause right, TraceStructureQuery.Relation relation) {
        List<TraceSpanNodeDto> leftMatches = spans.stream().filter(span -> matchesClause(span, left)).toList();
        List<TraceSpanNodeDto> rightMatches = spans.stream().filter(span -> matchesClause(span, right)).toList();
        if (relation == TraceStructureQuery.Relation.EITHER) return !leftMatches.isEmpty() || !rightMatches.isEmpty();
        if (leftMatches.isEmpty() || rightMatches.isEmpty()) return false;
        Map<String, TraceSpanNodeDto> observed = new HashMap<>();
        for (TraceSpanNodeDto span : spans) observed.put(span.getSpanId(), span);
        for (TraceSpanNodeDto a : leftMatches) {
            for (TraceSpanNodeDto b : rightMatches) {
                if (a.getSpanId().equals(b.getSpanId())) continue;
                if (relation == TraceStructureQuery.Relation.BOTH
                        || relation == TraceStructureQuery.Relation.DIRECT && a.getSpanId().equals(b.getParentSpanId())
                        || relation == TraceStructureQuery.Relation.UPSTREAM && isObservedAncestor(a.getSpanId(), b, observed)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean matchesClause(TraceSpanNodeDto span, TraceStructureQuery.Clause clause) {
        return (clause.serviceName() == null || clause.serviceName().equals(span.getServiceName()))
                && (clause.operationName() == null || clause.operationName().equals(span.getSpanName()))
                && (clause.status() == null || clause.status().equalsIgnoreCase(span.getStatus()));
    }

    private static boolean isObservedAncestor(String ancestorId, TraceSpanNodeDto child,
                                              Map<String, TraceSpanNodeDto> observed) {
        Set<String> seen = new HashSet<>();
        String current = child.getParentSpanId();
        while (current != null && seen.add(current)) {
            if (current.equals(ancestorId)) return true;
            TraceSpanNodeDto parent = observed.get(current);
            if (parent == null) return false;
            current = parent.getParentSpanId();
        }
        return false;
    }
}
