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

import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;

/**
 * Per-run transcript sink for one runtime invocation.
 */
@Slf4j
public class AgentRuntimeRunSink implements AgentRuntimeTranscriptSink {

    private final AgentSession session;
    private final AgentRun run;
    private final AgentTranscriptRecorder transcriptRecorder;
    private final AtomicBoolean closed = new AtomicBoolean();

    public AgentRuntimeRunSink(AgentSession session, AgentRun run,
                               AgentTranscriptRecorder transcriptRecorder) {
        // RuntimeService creates this sink only after resolving persisted session/run aggregates and a recorder.
        this.session = Objects.requireNonNull(session, "session must not be null");
        this.run = Objects.requireNonNull(run, "run must not be null");
        this.transcriptRecorder = Objects.requireNonNull(transcriptRecorder,
                "transcriptRecorder must not be null");
    }

    public String getRunUid() {
        return run.getRunUid();
    }

    @Override
    public Long recordMessage(TranscriptMessage message) {
        // The runtime loop records only materialized transcript messages; null is a caller contract violation.
        Objects.requireNonNull(message, "message must not be null");
        if (closed.get()) {
            return null;
        }
        try {
            return transcriptRecorder.recordRunMessage(session, run, message).getSessionSequence();
        } catch (RuntimeException exception) {
            log.debug("Agent Gateway incremental transcript append failed for run {}",
                    getRunUid(), exception);
            return null;
        }
    }

    @Override
    public void recordCompactionCheckpoint(AgentRuntimeHistoryWindow.CompactionCheckpoint checkpoint) {
        if (closed.get()) {
            return;
        }
        try {
            transcriptRecorder.recordCompactionCheckpoint(session, checkpoint);
        } catch (RuntimeException exception) {
            log.debug("Agent Gateway compaction checkpoint append failed for session {}",
                    session.getSessionUid(), exception);
        }
    }

    public void close() {
        closed.compareAndSet(false, true);
    }
}
