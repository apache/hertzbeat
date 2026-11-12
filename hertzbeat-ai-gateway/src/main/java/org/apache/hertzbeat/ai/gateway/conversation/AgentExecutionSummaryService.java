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

package org.apache.hertzbeat.ai.gateway.conversation;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.runtime.AgentMonitorPageCoverage;
import org.apache.hertzbeat.common.util.JsonUtil;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Projects ledger execution facts and allowlisted query coverage without exposing raw inputs, outputs or model claims. */
@Service
public class AgentExecutionSummaryService {
    private static final int MAX_FAILURES = 20;
    private static final int MAX_COVERAGE = 40;
    private final AgentToolCallDao calls;

    public AgentExecutionSummaryService(AgentToolCallDao calls) {
        this.calls = calls;
    }

    public AgentExecutionSummary summarize(AgentRun run) {
        List<AgentToolCall> rows;
        try {
            rows = calls.findByRunIdOrderByGmtCreateAsc(run.getId());
        } catch (org.springframework.dao.DataAccessException unavailable) {
            return AgentExecutionSummary.unavailable();
        }
        if (rows == null || rows.stream().anyMatch(row -> !belongsToRun(row, run))) {
            return AgentExecutionSummary.unavailable();
        }
        rows = rows.stream().sorted(Comparator.comparing(AgentToolCall::getId)).toList();
        List<AgentExecutionSummary.Failure> failures = new ArrayList<>();
        int succeeded = 0;
        int failed = 0;
        int recovered = 0;
        int unfinished = 0;
        for (int i = 0; i < rows.size(); i++) {
            AgentToolCall row = rows.get(i);
            if ("SUCCEEDED".equals(row.getStatus())) {
                succeeded++;
            } else if ("FAILED".equals(row.getStatus()) || "DENIED".equals(row.getStatus())) {
                failed++;
                var failure = failure(row, rows.subList(i + 1, rows.size()));
                if ("SAME_REQUEST_SUCCEEDED".equals(failure.recovery())) {
                    recovered++;
                }
                if (failures.size() < MAX_FAILURES) {
                    failures.add(failure);
                }
            } else {
                unfinished++;
            }
        }
        List<AgentQueryCoverage> coverage = new ArrayList<>(rows.stream().map(new AgentQueryCoverageProjector()::project)
                .filter(Objects::nonNull).toList());
        AgentMonitorPageCoverage monitorPages = new AgentMonitorPageCoverage();
        for (AgentToolCall row : rows) {
            if ("monitor.query".equals(row.getToolName()) && "SUCCEEDED".equals(row.getStatus()) && "READ".equals(row.getRisk())) {
                try {
                    monitorPages.observe(row.getToolCallId(), JsonUtil.fromJson(row.getInputJson(), Map.class), row.getResultOutput());
                } catch (RuntimeException invalid) {
                    // Invalid metadata cannot establish a complete page union.
                }
            }
        }
        var coveredPages = monitorPages.coveredCalls();
        if (coveredPages.size() > 1) {
            coverage.add(new AgentQueryCoverage("monitor-pages:" + run.getRunUid(), "monitor.query", "OBSERVED_ROWS", "rows",
                    null, null, 0L, monitorPages.total(), monitorPages.total(), false, false,
                    Map.of("coverage", "union of identical-scope pages; not an atomic snapshot")));
        }
        String stopReason = !"SUCCEEDED".equals(run.getStatus()) && StringUtils.hasText(run.getErrorMessage())
                ? AgentRuntimeTextSanitizer.sanitizeAndLimit(run.getErrorMessage(), 1000) : null;
        String status = status(run, rows.size(), failed, recovered, unfinished);
        if (!"IN_PROGRESS".equals(status) && !"NO_RECORDS".equals(status)
                && (stopReason != null || coverage.stream().anyMatch(item -> "UNKNOWN".equals(item.state())
                        || item.partial() && "ALL_ROWS".equals(item.scope().get("purpose"))
                        && !coveredPages.contains(item.toolCallId())) || coverage.size() > MAX_COVERAGE)) {
            status = "PARTIAL";
        }
        return new AgentExecutionSummary(status, rows.size(), succeeded, failed, recovered,
                failed - recovered, unfinished, failures, failed > failures.size(),
                coverage.stream().limit(MAX_COVERAGE).toList(), coverage.size() > MAX_COVERAGE, stopReason);
    }

    private boolean belongsToRun(AgentToolCall row, AgentRun run) {
        return row != null && row.getId() != null && row.getId() > 0
                && Objects.equals(run.getId(), row.getRunId())
                && Objects.equals(run.getRunUid(), row.getRunUid())
                && Objects.equals(run.getSessionId(), row.getSessionId());
    }

    private AgentExecutionSummary.Failure failure(AgentToolCall row, List<AgentToolCall> later) {
        var successes = later.stream()
                .filter(next -> "SUCCEEDED".equals(next.getStatus())
                        && Objects.equals(row.getToolName(), next.getToolName())
                        && "READ".equals(row.getRisk()) && "READ".equals(next.getRisk())).toList();
        var same = successes.stream().filter(next -> StringUtils.hasText(row.getInputHash())
                && Objects.equals(row.getInputHash(), next.getInputHash())).findFirst();
        String recovery = same.isPresent() ? "SAME_REQUEST_SUCCEEDED"
                : successes.isEmpty() ? "UNRESOLVED" : "CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED";
        AgentToolCall success = same.orElseGet(() -> successes.isEmpty() ? null : successes.getFirst());
        return new AgentExecutionSummary.Failure(row.getToolCallId(), row.getToolName(), row.getStatus(),
                failureMessage(row), recovery,
                success == null ? null : success.getToolCallId());
    }

    private String failureMessage(AgentToolCall row) {
        String message = AgentRuntimeTextSanitizer.sanitizeAndLimit(row.getErrorMessage(), 500);
        if (message != null && message.startsWith("REQUESTED_WINDOW:")) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> arguments = JsonUtil.fromJson(row.getInputJson(), Map.class);
                message += " " + org.apache.hertzbeat.ai.gateway.runtime.AgentRequestedQueryWindow.describeArguments(arguments);
            } catch (RuntimeException malformed) {
                message += " timeArguments=unavailable";
            }
        }
        return message;
    }

    private String status(AgentRun run, int total, int failed, int recovered, int unfinished) {
        if ("CREATED".equals(run.getStatus()) || "RUNNING".equals(run.getStatus())) {
            return "IN_PROGRESS";
        }
        if (total == 0) {
            return "NO_RECORDS";
        }
        if (unfinished > 0 || failed > recovered) {
            return "PARTIAL";
        }
        return failed > 0 ? "RECOVERED" : "NO_FAILED_ATTEMPTS";
    }
}
