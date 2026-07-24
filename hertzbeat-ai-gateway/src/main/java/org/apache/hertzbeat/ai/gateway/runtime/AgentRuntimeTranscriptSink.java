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

/**
 * Incremental transcript sink exposed to the runtime loop.
 *
 * <p>Each completed transcript message (assistant text, assistant tool calls,
 * tool result) is appended to durable storage as
 * soon as it is produced inside the loop, rather than being buffered until the
 * whole run finishes. Implementations must be safe to call from the loop thread
 * and must not throw; persistence failures are swallowed so they cannot change
 * the loop outcome (mirroring the "observability only" contract of
 * {@link AgentRuntimeLoop.EventPublisher}).
 */
public interface AgentRuntimeTranscriptSink {

    /**
     * Append one transcript message immediately.
     *
     * @param message the message produced by the current loop step
     * @return the durable session sequence, or {@code null} when the message was not persisted
     */
    Long recordMessage(TranscriptMessage message);

    /**
     * Persist a compaction checkpoint for future session history reads.
     */
    default void recordCompactionCheckpoint(AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint) {
        // Most lightweight sinks do not persist session checkpoints.
    }

    /**
     * No-op sink used when incremental persistence is disabled (e.g. tests).
     *
     * @return a sink that discards every invocation
     */
    static AgentRuntimeTranscriptSink noop() {
        return message -> null;
    }
}
