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

package org.apache.hertzbeat.ai.gateway.application;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.util.concurrent.Queues;

/**
 * Separates the durable runtime subscription from optional client demand.
 */
@Slf4j
final class AgentGatewayLifecycleRelay {

    private static final int LIVE_BUFFER_SIZE = Queues.SMALL_BUFFER_SIZE;
    private static final String LIFECYCLE_FAILURE = "Agent Gateway lifecycle failed";

    private final String runUid;
    private final Sinks.One<GatewayEvent> started = Sinks.one();
    private final Sinks.Many<GatewayEvent> live = Sinks.many().multicast()
            .onBackpressureBuffer(LIVE_BUFFER_SIZE, false);
    private final Sinks.One<GatewayEvent> terminal = Sinks.one();
    private final AtomicBoolean primaryClient = new AtomicBoolean();
    private final AtomicBoolean drainStarted = new AtomicBoolean();
    private final AtomicBoolean startSeen = new AtomicBoolean();
    private final AtomicBoolean terminalSeen = new AtomicBoolean();
    private final AtomicLong droppedLiveEvents = new AtomicLong();

    AgentGatewayLifecycleRelay(String runUid) {
        this.runUid = runUid;
    }

    Flux<GatewayEvent> connect(Flux<GatewayEvent> lifecycle) {
        return Flux.defer(() -> {
            Flux<GatewayEvent> clientEvents = primaryClient.compareAndSet(false, true)
                    ? Flux.concat(started.asMono(), live.asFlux(), terminal.asMono())
                    : terminal.asMono().flux();
            return clientEvents.doOnSubscribe(ignored -> startDrain(lifecycle));
        });
    }

    void fail(Throwable failure) {
        completeStartIfMissing();
        completeLive();
        Throwable clientFailure = isFatal(failure)
                ? failure
                : new IllegalStateException(LIFECYCLE_FAILURE);
        emitCritical("terminal failure", terminal.tryEmitError(clientFailure));
    }

    private void startDrain(Flux<GatewayEvent> lifecycle) {
        if (!drainStarted.compareAndSet(false, true)) {
            return;
        }
        try {
            lifecycle.subscribe(this::emit, this::fail, this::complete);
        } catch (RuntimeException failure) {
            fail(failure);
            throw failure;
        } catch (Error failure) {
            fail(failure);
            throw failure;
        }
    }

    private void emit(GatewayEvent event) {
        if (event.type() == GatewayEvent.GatewayEventType.RUN_STARTED) {
            startSeen.set(true);
            emitCritical("run start", started.tryEmitValue(event));
            return;
        }
        if (event.type() == GatewayEvent.GatewayEventType.RUN_COMPLETED
                || event.type() == GatewayEvent.GatewayEventType.ERROR) {
            terminalSeen.set(true);
            emitCritical("terminal event", terminal.tryEmitValue(event));
            return;
        }
        Sinks.EmitResult result = live.tryEmitNext(event);
        if (result.isFailure()) {
            long dropped = droppedLiveEvents.incrementAndGet();
            if (dropped == 1) {
                log.warn("Agent Gateway live event buffer is full for run {}; dropping nonterminal events", runUid);
            }
        }
    }

    private void complete() {
        completeStartIfMissing();
        completeLive();
        if (!terminalSeen.get()) {
            emitCritical("missing terminal event", terminal.tryEmitError(
                    new IllegalStateException(LIFECYCLE_FAILURE)));
        }
        long dropped = droppedLiveEvents.get();
        if (dropped > 1) {
            log.warn("Agent Gateway dropped {} nonterminal live events for run {}", dropped, runUid);
        }
    }

    private void completeStartIfMissing() {
        if (!startSeen.get()) {
            emitCritical("empty run start", started.tryEmitEmpty());
        }
    }

    private void completeLive() {
        emitCritical("live completion", live.tryEmitComplete());
    }

    private void emitCritical(String signal, Sinks.EmitResult result) {
        if (result.isFailure()) {
            log.warn("Agent Gateway could not emit {} for run {}: {}", signal, runUid, result);
        }
    }

    private boolean isFatal(Throwable failure) {
        return failure instanceof VirtualMachineError
                || failure instanceof ThreadDeath
                || failure instanceof LinkageError;
    }
}
