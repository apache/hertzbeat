/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.job.Job;
import org.springframework.stereotype.Service;

/** Conditional command orchestration over the serialized real-state owner. */
@Service
@RequiredArgsConstructor
public class MonitorDefinitionCommandService implements MonitorDefinitionCommandPort {

    private static final int SCHEMA_VERSION = 1;

    private final MonitorDefinitionCommandExecutor executor;

    @Override
    public MonitorDefinitionSource create(String definition) {
        return executor.executeSerialized(state -> {
            Job parsed = parse(state, definition);
            if (find(parsed.getApp(), state.readAll()) != null) {
                throw failure(MonitorDefinitionErrorCode.CREATE_CONFLICT);
            }
            persistAndApply(state, parsed, definition, null);
            return require(parsed.getApp(), state.readAll());
        });
    }

    @Override
    public MonitorDefinitionSource update(String app, String expectedRevision, String definition) {
        return executor.executeSerialized(state -> {
            MonitorDefinitionSource previous = require(app, state.readAll());
            Job parsed = parse(state, definition);
            if (MonitorDefinitionRevision.origin(previous) == MonitorDefinitionOrigin.BUILTIN) {
                throw failure(MonitorDefinitionErrorCode.IMMUTABLE);
            }
            if (!previous.job().getApp().equals(app) || !previous.job().getApp().equals(parsed.getApp())) {
                throw failure(MonitorDefinitionErrorCode.UPDATE_TARGET_MISMATCH);
            }
            requireRevision(previous, expectedRevision);
            parsed.setHide(previous.job().isHide());
            persistAndApply(state, parsed, definition, previous);
            return require(app, state.readAll());
        });
    }

    @Override
    public MonitorDefinitionDeleteResponse delete(String app, String expectedRevision) {
        return executor.executeSerialized(state -> {
            MonitorDefinitionSource previous = require(app, state.readAll());
            MonitorDefinitionOrigin origin = MonitorDefinitionRevision.origin(previous);
            if (origin == MonitorDefinitionOrigin.BUILTIN) {
                throw failure(MonitorDefinitionErrorCode.IMMUTABLE);
            }
            requireRevision(previous, expectedRevision);
            String canonicalApp = previous.job().getApp();
            try {
                if (state.inUse(canonicalApp)) {
                    throw failure(MonitorDefinitionErrorCode.IN_USE);
                }
            } catch (MonitorDefinitionException error) {
                throw error;
            } catch (RuntimeException error) {
                throw failure(MonitorDefinitionErrorCode.PERSISTENCE_FAILED);
            }
            try {
                state.remove(canonicalApp);
            } catch (RuntimeException error) {
                throw failure(MonitorDefinitionErrorCode.PERSISTENCE_FAILED);
            }
            try {
                state.publishRemoval(canonicalApp);
            } catch (RuntimeException error) {
                throw failure(MonitorDefinitionErrorCode.STATE_UNCERTAIN);
            }
            MonitorDefinitionDeleteDisposition disposition = origin == MonitorDefinitionOrigin.OVERRIDE
                    ? MonitorDefinitionDeleteDisposition.BUILTIN_RESTORED
                    : MonitorDefinitionDeleteDisposition.REMOVED;
            return new MonitorDefinitionDeleteResponse(SCHEMA_VERSION, canonicalApp, disposition);
        });
    }

    private static Job parse(MonitorDefinitionCommandState state, String definition) {
        try {
            Job parsed = state.validate(definition);
            MonitorDefinitionIdentity.requireSafe(parsed.getApp());
            return parsed;
        } catch (MonitorDefinitionException error) {
            throw error;
        } catch (RuntimeException error) {
            throw failure(MonitorDefinitionErrorCode.INVALID_DEFINITION);
        }
    }

    /** Persistence, publication, and Runtime convergence execute inside one owner transaction. */
    private static void persistAndApply(
            MonitorDefinitionCommandState state,
            Job parsed,
            String definition,
            MonitorDefinitionSource previous) {
        try {
            state.save(parsed.getApp(), definition);
        } catch (RuntimeException error) {
            throw failure(MonitorDefinitionErrorCode.PERSISTENCE_FAILED);
        }
        state.publish(parsed, definition);
        try {
            state.updateRuntime(parsed);
        } catch (RuntimeException runtimeError) {
            compensateRuntimeFailure(state, parsed, previous);
        }
    }

    private static void compensateRuntimeFailure(
            MonitorDefinitionCommandState state, Job parsed, MonitorDefinitionSource previous) {
        try {
            if (previous == null) {
                state.remove(parsed.getApp());
                state.publishRemoval(parsed.getApp());
            } else {
                state.save(previous.job().getApp(), previous.definition());
                state.publish(previous.job(), previous.definition());
                state.updateRuntime(previous.job());
            }
        } catch (RuntimeException compensationError) {
            throw failure(MonitorDefinitionErrorCode.STATE_UNCERTAIN);
        }
        throw failure(MonitorDefinitionErrorCode.RUNTIME_UPDATE_FAILED);
    }

    private static void requireRevision(MonitorDefinitionSource source, String expectedRevision) {
        if (!MonitorDefinitionRevision.from(source).equals(expectedRevision)) {
            throw failure(MonitorDefinitionErrorCode.REVISION_CONFLICT);
        }
    }

    private static MonitorDefinitionSource require(String app, List<MonitorDefinitionSource> sources) {
        MonitorDefinitionSource source = find(app, sources);
        if (source == null) {
            throw failure(MonitorDefinitionErrorCode.NOT_FOUND);
        }
        return source;
    }

    private static MonitorDefinitionSource find(String app, List<MonitorDefinitionSource> sources) {
        String identity = MonitorDefinitionIdentity.normalize(app);
        return sources.stream()
                .filter(source -> MonitorDefinitionIdentity.normalize(source.job().getApp()).equals(identity))
                .findFirst()
                .orElse(null);
    }

    private static MonitorDefinitionException failure(MonitorDefinitionErrorCode errorCode) {
        return new MonitorDefinitionException(errorCode);
    }
}
