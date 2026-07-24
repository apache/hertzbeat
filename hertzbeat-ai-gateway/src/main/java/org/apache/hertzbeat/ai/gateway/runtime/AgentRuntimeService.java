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

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.skill.AgentSkillDefinition;
import org.apache.hertzbeat.ai.gateway.skill.AgentSkillRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;
import reactor.core.scheduler.Schedulers;

/**
 * Default Agent Gateway runtime service.
 */
@Slf4j
@Service
public class AgentRuntimeService {

    private final AgentRuntimeProperties runtimeProperties;
    private final AgentRuntimeContextBuilder contextBuilder;
    private final AgentToolBridge toolBridge;
    private final AgentRuntimeModelClient modelClient;
    private final AgentRuntimeControlRegistry controlRegistry;
    private final AgentTranscriptRecorder transcriptRecorder;
    private final Clock clock;
    private final List<AgentSkillDefinition> availableSkills;

    @Autowired
    public AgentRuntimeService(AgentRuntimeProperties runtimeProperties,
                               AgentToolRegistry toolRegistry,
                               AgentToolExecutionOrchestrator toolExecutionOrchestrator,
                               ObjectProvider<AgentRuntimeModelClient> modelClientProvider,
                               AgentRuntimeControlRegistry controlRegistry,
                               AgentRuntimeApprovalRegistry approvalRegistry,
                               AgentTranscriptRecorder transcriptRecorder,
                               AgentSkillRegistry skillRegistry) {
        this(runtimeProperties,
                new AgentRuntimeContextBuilder(Clock.systemUTC(), () -> java.util.UUID.randomUUID().toString()),
                new AgentToolBridge(toolRegistry, toolExecutionOrchestrator, approvalRegistry),
                modelClientProvider.getIfUnique(),
                controlRegistry,
                transcriptRecorder,
                Clock.systemUTC(),
                skillRegistry.definitions());
    }

    AgentRuntimeService(AgentRuntimeProperties runtimeProperties,
                        AgentRuntimeContextBuilder contextBuilder,
                        AgentToolBridge toolBridge,
                        AgentRuntimeModelClient modelClient,
                        AgentRuntimeControlRegistry controlRegistry,
                        AgentTranscriptRecorder transcriptRecorder,
                        Clock clock) {
        this(runtimeProperties, contextBuilder, toolBridge, modelClient, controlRegistry,
                transcriptRecorder, clock, List.of());
    }

    AgentRuntimeService(AgentRuntimeProperties runtimeProperties,
                        AgentRuntimeContextBuilder contextBuilder,
                        AgentToolBridge toolBridge,
                        AgentRuntimeModelClient modelClient,
                        AgentRuntimeControlRegistry controlRegistry,
                        AgentTranscriptRecorder transcriptRecorder,
                        Clock clock,
                        List<AgentSkillDefinition> availableSkills) {
        // Runtime properties and collaborators are fixed at construction; null would defer a composition failure.
        this.runtimeProperties = Objects.requireNonNull(runtimeProperties, "runtimeProperties must not be null");
        this.contextBuilder = Objects.requireNonNull(contextBuilder, "contextBuilder must not be null");
        this.toolBridge = Objects.requireNonNull(toolBridge, "toolBridge must not be null");
        // The model client is optional because a deployment may omit the provider bean and return a configured error.
        this.modelClient = modelClient;
        this.controlRegistry = Objects.requireNonNull(controlRegistry, "controlRegistry must not be null");
        this.transcriptRecorder = Objects.requireNonNull(transcriptRecorder, "transcriptRecorder must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        this.availableSkills = List.copyOf(availableSkills);
    }

    public Flux<AgentRuntimeEvent> streamInvoke(AgentRuntimeRequest request) {
        return Flux.create(sink -> {
            AtomicReference<AgentRuntimeControl> controlRef = new AtomicReference<>();
            Disposable task = Schedulers.boundedElastic().schedule(() -> doStreamInvoke(request, sink, controlRef));
            sink.onCancel(() -> {
                AgentRuntimeControl control = controlRef.get();
                if (control != null) {
                    control.stop("Runtime stream client disconnected.");
                }
                task.dispose();
            });
        }, FluxSink.OverflowStrategy.BUFFER);
    }

    private void doStreamInvoke(AgentRuntimeRequest request, FluxSink<AgentRuntimeEvent> sink,
                                AtomicReference<AgentRuntimeControl> controlRef) {
        AgentRuntimeContext context = null;
        AgentRuntimeControl control = null;
        AutoCloseable controlRegistration = null;
        AgentRuntimeRunSink runSink = null;
        AgentRuntimeProperties config = runtimeProperties;
        AgentRuntimeLoop.EventPublisher publisher = streamingPublisher(sink, controlRef, config.getStream());
        try {
            context = contextBuilder.build(request, config);
            if (modelClient == null) {
                publishStarted(publisher, context);
                publishTerminalEvent(publisher, context, AgentRuntimeEventType.ERROR,
                        "Agent Gateway runtime model client is not configured.");
                completeStream(sink);
                return;
            }
            runSink = new AgentRuntimeRunSink(request.getSession(), request.getRun(), transcriptRecorder);
            control = AgentRuntimeControl.forContext(context, clock);
            controlRef.set(control);
            controlRegistration = controlRegistry.register(control);
            new AgentRuntimeLoop(config, modelClient, toolBridge, clock, availableSkills)
                    .run(context, control, publisher, runSink);
            completeStream(sink);
        } catch (AgentRuntimeStoppedException exception) {
            publishTerminalEvent(publisher, context, AgentRuntimeEventType.ERROR, exception.getMessage());
            completeStream(sink);
        } catch (RuntimeException exception) {
            log.debug("Agent Gateway runtime stream invocation failed", exception);
            publishTerminalEvent(publisher, context, AgentRuntimeEventType.ERROR,
                    "Agent Gateway runtime failed: " + exception.getMessage());
            completeStream(sink);
        } finally {
            closeQuietly(controlRegistration);
            closeQuietly(control);
            if (runSink != null) {
                runSink.close();
            }
            controlRef.compareAndSet(control, null);
        }
    }

    private AgentRuntimeLoop.EventPublisher streamingPublisher(FluxSink<AgentRuntimeEvent> sink,
                                                          AtomicReference<AgentRuntimeControl> controlRef,
                                                          AgentRuntimeProperties.StreamProperties streamProperties) {
        AtomicLong bufferedEvents = new AtomicLong();
        int maxBufferedEvents = streamProperties.getMaxBufferedEvents();
        sink.onRequest(requested -> reduceBufferedEvents(bufferedEvents, requested));
        return event -> {
            if (event == null || sink.isCancelled()) {
                return;
            }
            if (sink.requestedFromDownstream() <= 0
                    && bufferedEvents.incrementAndGet() > maxBufferedEvents) {
                signalBackpressureExceeded(sink, controlRef, streamProperties, event);
                return;
            }
            sink.next(event);
        };
    }

    private void reduceBufferedEvents(AtomicLong bufferedEvents, long requested) {
        if (requested <= 0) {
            return;
        }
        bufferedEvents.updateAndGet(current -> Math.max(0L, current - requested));
    }

    private void signalBackpressureExceeded(FluxSink<AgentRuntimeEvent> sink,
                                            AtomicReference<AgentRuntimeControl> controlRef,
                                            AgentRuntimeProperties.StreamProperties streamProperties,
                                            AgentRuntimeEvent sourceEvent) {
        if (streamProperties.isCancelOnBackpressure()) {
            AgentRuntimeControl control = controlRef.get();
            if (control != null) {
                control.stop("Runtime stream exceeded the buffered event limit.");
            }
        }
        if (sink.isCancelled()) {
            return;
        }
        sink.next(AgentRuntimeEvent.runError(sourceEvent.getTraceId(),
                "Runtime stream exceeded the buffered event limit.", Instant.now(clock)));
        completeStream(sink);
    }

    private void completeStream(FluxSink<AgentRuntimeEvent> sink) {
        if (!sink.isCancelled()) {
            sink.complete();
        }
    }

    private void publishStarted(AgentRuntimeLoop.EventPublisher publisher, AgentRuntimeContext context) {
        publisher.publish(AgentRuntimeEvent.runStarted(context.getTraceId(), Instant.now(clock)));
    }

    private void publishTerminalEvent(AgentRuntimeLoop.EventPublisher publisher, AgentRuntimeContext context,
                                      AgentRuntimeEventType type,
                                      String message) {
        String traceId = context == null ? null : context.getTraceId();
        publisher.publish(type == AgentRuntimeEventType.ERROR
                ? AgentRuntimeEvent.runError(traceId, message, Instant.now(clock))
                : AgentRuntimeEvent.runCompleted(traceId, Instant.now(clock)));
    }

    private void closeQuietly(AutoCloseable closeable) {
        if (closeable == null) {
            return;
        }
        try {
            closeable.close();
        } catch (Exception ignored) {
            // Runtime control cleanup is best effort after terminal result publication.
        }
    }
}
