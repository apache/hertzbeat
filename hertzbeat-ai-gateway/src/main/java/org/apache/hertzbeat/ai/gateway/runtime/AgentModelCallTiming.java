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

import org.springframework.ai.chat.metadata.ChatResponseMetadata;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

/**
 * Content-free timings for one actual provider attempt. Chunk/text times are not inferred token
 * times.
 */
final class AgentModelCallTiming {
    private static final org.slf4j.Logger LOG =
            org.slf4j.LoggerFactory.getLogger(AgentRuntimeSafeTrace.class);
    private final String callId = java.util.UUID.randomUUID().toString();
    private final String runUid;
    private final String phase;
    private final Clock clock;
    private final LongSupplier nanos;
    private final long started;
    private final String startedAt;
    private final AtomicLong firstChunk = new AtomicLong(-1);
    private final AtomicLong firstText = new AtomicLong(-1);

    AgentModelCallTiming(String runUid, AgentRuntimeModelRequest request) {
        this(runUid, request, Clock.systemUTC(), System::nanoTime);
    }

    AgentModelCallTiming(
            String runUid, AgentRuntimeModelRequest request, Clock clock, LongSupplier nanos) {
        this.runUid = runUid;
        this.phase = AgentRuntimeSafeTrace.phase(request);
        this.clock = clock;
        this.nanos = nanos;
        this.started = nanos.getAsLong();
        this.startedAt = clock.instant().toString();
        LOG.debug(
                "Agent model timing started runUid={} callId={} phase={} startedAt={}"
                    + " maxCompletionTokens={}",
                runUid,
                callId,
                phase,
                startedAt,
                request.getMaxCompletionTokens());
    }

    void chunk() {
        firstChunk.compareAndSet(-1, Math.max(0, nanos.getAsLong() - started));
    }

    void text(String delta) {
        if (delta != null && !delta.isEmpty())
            firstText.compareAndSet(-1, Math.max(0, nanos.getAsLong() - started));
    }

    Map<String, Object> finish(
            ChatResponseMetadata metadata, String finish, boolean completed, boolean stopped) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("phase", phase);
        fields.put("startedAt", startedAt);
        fields.put("endedAt", clock.instant().toString());
        fields.put("elapsedMs", ms(Math.max(0, nanos.getAsLong() - started)));
        fields.put("firstChunkMs", ms(firstChunk.get()));
        fields.put("firstTextDeltaMs", ms(firstText.get()));
        fields.put("finishReason", AgentRuntimeSafeTrace.finishReason(finish));
        fields.put("streamOutcome", stopped ? "STOPPED" : completed ? "COMPLETED" : "FAILED");
        String model = metadata == null ? null : metadata.getModel();
        fields.put(
                "advertisedModel",
                model != null && model.matches("[A-Za-z0-9._-]{1,128}") ? model : "NOT_ADVERTISED");
        var usage = metadata == null ? null : metadata.getUsage();
        boolean supplied = usage != null && !usage.getClass().getSimpleName().equals("EmptyUsage");
        fields.put("usageSource", supplied ? "SPRING_AI_METADATA" : "NOT_ADVERTISED");
        if (supplied) {
            if (usage.getPromptTokens() != null)
                fields.put("promptTokens", usage.getPromptTokens());
            if (usage.getCompletionTokens() != null)
                fields.put("completionTokens", usage.getCompletionTokens());
            if (usage.getTotalTokens() != null) fields.put("totalTokens", usage.getTotalTokens());
        }
        LOG.debug("Agent model timing ended runUid={} callId={} timing={}", runUid, callId, fields);
        return Map.copyOf(fields);
    }

    private long ms(long value) {
        return value < 0 ? -1 : java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(value);
    }
}
