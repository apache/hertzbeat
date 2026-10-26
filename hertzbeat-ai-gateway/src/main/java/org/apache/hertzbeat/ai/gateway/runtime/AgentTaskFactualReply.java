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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.text.MessageFormat;
import java.util.List;
import java.util.Map;

/** Fixed copy rendered solely from validated domain receipts, never model prose. */
final class AgentTaskFactualReply {
    static String grafana(AgentRuntimeContext context, Map<String, Object> receipt) {
        if ("DELETE".equals(receipt.get("operation")))
            return MessageFormat.format(
                    AgentTaskCompletionReview.message(context, "grafanaDeleted"),
                    receipt.get("uid"),
                    String.valueOf(receipt.get("monitorId")),
                    AgentTaskCompletionReview.message(
                            context,
                            Boolean.TRUE.equals(receipt.get("remoteDashboardRemoved"))
                                    ? "grafanaRemoteDeleted"
                                    : "grafanaRemoteNotDeleted"));
        return MessageFormat.format(
                AgentTaskCompletionReview.message(context, "grafanaSaved"),
                receipt.get("uid"),
                String.valueOf(receipt.get("monitorId")),
                String.valueOf(receipt.get("version")));
    }

    static String grafanaBlocked(AgentRuntimeContext context, java.util.Set<String> codes) {
        return MessageFormat.format(
                AgentTaskCompletionReview.message(context, "grafanaBlocked"),
                String.join(", ", codes));
    }

    static String grafanaFailure(AgentRuntimeContext context, Map<String, Object> failure) {
        return MessageFormat.format(
                AgentTaskCompletionReview.message(
                        context,
                        Boolean.TRUE.equals(failure.get("outcomeUnknown"))
                                ? "grafanaUnverifiedFailure"
                                : "grafanaNoWriteFailure"),
                failure.get("reasonCode"));
    }

    static String definition(AgentRuntimeContext context, Map<String, Object> receipt) {
        return MessageFormat.format(
                AgentTaskCompletionReview.message(context, "definitionSaved"),
                receipt.get("app"),
                receipt.get("revision"));
    }

    static String batchStatus(AgentRuntimeContext context, Map<String, Object> batch) {
        var rows = (List<?>) batch.get("items");
        String ids =
                rows.stream()
                        .filter(
                                v ->
                                        v instanceof Map<?, ?> item
                                                && "VERIFIED".equals(item.get("state")))
                        .map(v -> String.valueOf(((Map<?, ?>) v).get("monitorId")))
                        .collect(java.util.stream.Collectors.joining(", "));
        return MessageFormat.format(
                AgentTaskCompletionReview.message(context, "batchReadReceipts"),
                batch.get("verified"),
                rows.size(),
                batch.get("failed"),
                batch.get("pending"),
                batch.get("unknown"),
                ids.isBlank() ? "—" : ids);
    }

    static String instrumentation(AgentRuntimeContext context, java.util.Set<String> codes) {
        return MessageFormat.format(
                AgentTaskCompletionReview.message(context, "instrumentationBlocked"),
                String.join(", ", codes));
    }
}
