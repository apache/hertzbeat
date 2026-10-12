/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.investigation.service;

import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationLogRecord;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationReason;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.common.observability.dto.investigation.LogInvestigationView;
import org.apache.hertzbeat.common.observability.dto.investigation.LogInvestigationView.MetricsBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.LogInvestigationView.NearbyLogsBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.LogInvestigationView.SelectedLogBlock;
import org.apache.hertzbeat.common.observability.dto.investigation.LogInvestigationView.TraceBlock;
import org.apache.hertzbeat.observability.investigation.service.InvestigationTraceAssembler.MalformedTraceException;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.RowsResult;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.Status;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.util.regex.Pattern;

/** Composes one honest bounded Log investigation. */
@Service
public class LogInvestigationReadModelService {

    private static final Pattern LOG_RECORD_UID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private final ObjectProvider<InvestigationQueryRepository> repositoryProvider;

    public LogInvestigationReadModelService(ObjectProvider<InvestigationQueryRepository> repositoryProvider) {
        this.repositoryProvider = repositoryProvider;
    }

    public LogInvestigationView query(String workspaceId, String logRecordUid, long start, long end) {
        InvestigationWindow window = new InvestigationWindow(start, end);
        if (logRecordUid == null || !LOG_RECORD_UID.matcher(logRecordUid).matches()) {
            throw new ObservabilityQueryRequestException();
        }
        InvestigationQueryRepository repository = repository();
        if (repository == null) {
            return unavailable(logRecordUid, window, InvestigationReason.STORAGE_UNAVAILABLE);
        }
        RowsResult<InvestigationLogRecord> selectedResult = repository.selectedLog(
                new InvestigationQueryRepository.LogQuery(workspaceId, logRecordUid, start, end));
        if (selectedResult.status() != Status.AVAILABLE) {
            return unavailable(logRecordUid, window, TraceInvestigationReadModelService.reason(selectedResult.status()));
        }
        if (selectedResult.rows().isEmpty()) {
            return new LogInvestigationView(logRecordUid, window, SelectedLogBlock.empty(),
                    TraceBlock.unavailable(InvestigationReason.UPSTREAM_UNAVAILABLE),
                    MetricsBlock.unavailable(InvestigationReason.UPSTREAM_UNAVAILABLE),
                    NearbyLogsBlock.unavailable(InvestigationReason.UPSTREAM_UNAVAILABLE));
        }
        if (selectedResult.rows().size() != 1) {
            return unavailable(logRecordUid, window, InvestigationReason.MALFORMED_DATA);
        }
        InvestigationLogRecord selected = selectedResult.rows().getFirst();
        TraceBlock trace = trace(repository, workspaceId, selected, start, end);
        NearbyLogsBlock nearby = nearby(repository, workspaceId, selected, start, end);
        return new LogInvestigationView(logRecordUid, window, SelectedLogBlock.ready(selected), trace,
                MetricsBlock.unavailable(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE), nearby);
    }

    private TraceBlock trace(InvestigationQueryRepository repository,
                             String workspaceId,
                             InvestigationLogRecord selected,
                             long start,
                             long end) {
        if (!StringUtils.hasText(selected.traceId())) {
            return TraceBlock.empty(InvestigationReason.NOT_CORRELATED);
        }
        RowsResult<InvestigationQueryRepository.TraceSpanRow> result = repository.trace(
                new InvestigationQueryRepository.TraceQuery(workspaceId, selected.traceId(), start, end,
                        selected.spanId()));
        if (result.status() != Status.AVAILABLE) {
            return TraceBlock.unavailable(TraceInvestigationReadModelService.reason(result.status()));
        }
        if (result.rows().isEmpty()) {
            return TraceBlock.empty(selected.spanId() == null ? InvestigationReason.NO_DATA : InvestigationReason.NOT_FOUND);
        }
        try {
            return TraceBlock.ready(InvestigationTraceAssembler.assemble(
                    selected.traceId(), selected.spanId(), result.rows(), result.truncated()).detail());
        } catch (ObservabilityQueryRequestException exception) {
            return TraceBlock.empty(InvestigationReason.NOT_FOUND);
        } catch (MalformedTraceException exception) {
            return TraceBlock.unavailable(InvestigationReason.MALFORMED_DATA);
        }
    }

    private NearbyLogsBlock nearby(InvestigationQueryRepository repository,
                                   String workspaceId,
                                   InvestigationLogRecord selected,
                                   long start,
                                   long end) {
        long selectedTime;
        try {
            selectedTime = Long.parseLong(selected.timeUnixNano());
        } catch (NumberFormatException exception) {
            return NearbyLogsBlock.unavailable(InvestigationReason.MALFORMED_DATA);
        }
        var identity = selected.identity();
        InvestigationQueryRepository.NearbyQuery query;
        if (identity != null) {
            query = new InvestigationQueryRepository.NearbyQuery(
                    workspaceId, selected.logRecordUid(), selectedTime, identity.serviceName(), identity.entityId(),
                    identity.entityType(), identity.serviceNamespace(), identity.deploymentEnvironment(), start, end);
        } else {
            String serviceName = selected.resourceAttributes().get("service.name");
            String hostName = selected.resourceAttributes().get("host.name");
            if (!StringUtils.hasText(serviceName) || !StringUtils.hasText(hostName)) {
                return NearbyLogsBlock.unavailable(InvestigationReason.IDENTITY_UNAVAILABLE);
            }
            String serviceNamespace = selected.resourceAttributes().get("service.namespace");
            String deploymentEnvironment = firstText(selected.resourceAttributes().get("deployment.environment.name"),
                    selected.resourceAttributes().get("deployment.environment"),
                    selected.resourceAttributes().get("env"));
            query = new InvestigationQueryRepository.NearbyQuery(
                    workspaceId, selected.logRecordUid(), selectedTime, serviceName, null, null,
                    serviceNamespace, deploymentEnvironment, start, end, hostName);
        }
        var result = repository.nearbyLogs(query);
        if (result.status() != Status.AVAILABLE) {
            return NearbyLogsBlock.unavailable(TraceInvestigationReadModelService.reason(result.status()));
        }
        if (result.before().isEmpty() && result.after().isEmpty()) {
            return NearbyLogsBlock.empty();
        }
        return NearbyLogsBlock.ready(result.before(), result.after(), result.hasMoreBefore(), result.hasMoreAfter());
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private InvestigationQueryRepository repository() {
        try {
            return repositoryProvider.getIfAvailable();
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private LogInvestigationView unavailable(String uid,
                                             InvestigationWindow window,
                                             InvestigationReason reason) {
        return new LogInvestigationView(uid, window, SelectedLogBlock.unavailable(reason),
                TraceBlock.unavailable(InvestigationReason.UPSTREAM_UNAVAILABLE),
                MetricsBlock.unavailable(InvestigationReason.UPSTREAM_UNAVAILABLE),
                NearbyLogsBlock.unavailable(InvestigationReason.UPSTREAM_UNAVAILABLE));
    }
}
