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

package org.apache.hertzbeat.observability.logs.service.impl;

import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import java.util.List;
import java.util.function.Predicate;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogSseService;
import org.apache.hertzbeat.observability.logs.sse.LogSelectedGroupMatcher;
import org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Default SSE service for logs.
 */
@Service
public class LogSseServiceImpl implements LogSseService {

    private final LogSseManager emitterManager;
    private final List<HistoryDataReader> readers;
    private final ObservabilityQueryAdmissionService admission;

    public LogSseServiceImpl(LogSseManager emitterManager, List<HistoryDataReader> readers,
                             ObservabilityQueryAdmissionService admission) {
        this.emitterManager = emitterManager;
        this.readers = List.copyOf(readers);
        this.admission = admission;
    }

    @Override
    public void validate(LogSseFilterCriteria criteria) { prepare(criteria); }

    @Override
    public SseEmitter subscribe(LogSseFilterCriteria criteria) {
        Predicate<LogEntry> matcher = prepare(criteria);
        if (TelemetrySourceContext.isSelf()) {
            return emitterManager.createPreparedEmitter(SnowFlakeIdGenerator.generateId(), matcher, true);
        }
        return emitterManager.createPreparedEmitter(SnowFlakeIdGenerator.generateId(), matcher);
    }

    private Predicate<LogEntry> prepare(LogSseFilterCriteria criteria) {
        var effective = criteria == null ? new LogSseFilterCriteria() : criteria;
        bindRequestWorkspace(effective);
        effective.normalizeQueryContext();
        var snapshot = effective.snapshot();
        if (snapshot.selection() == null) { return snapshot.matcher(); }
        String workspace = effective.getWorkspaceId();
        return admission.execute("logs", () -> {
            for (var reader : readers) {
                try {
                    var prepared = reader.prepareLogGroupSelection(workspace, snapshot.selection());
                    if (prepared == null || !snapshot.selection().equals(prepared.selection())) { throw new TelemetryStorageUnavailableException(); }
                    return snapshot.matcher().and(new LogSelectedGroupMatcher(prepared));
                } catch (UnsupportedOperationException unsupported) {
                    // Only explicitly capable readers may supply exact projection alternatives.
                } catch (RuntimeException failure) { throw new TelemetryStorageUnavailableException(); }
            }
            throw new LogFilterQueryException(LogFilterQueryException.Reason.GROUP_SELECTION_UNSUPPORTED);
        });
    }

    private void bindRequestWorkspace(LogSseFilterCriteria filterCriteria) {
        String workspaceId = AuthTokenRequestContext.currentAuthenticatedWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new IllegalArgumentException("Authenticated workspace is required");
        }
        filterCriteria.setWorkspaceId(AuthTokenScopes.normalizeWorkspaceId(workspaceId));
    }
}
