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

package org.apache.hertzbeat.observability.logs.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.repository.RepeatedErrorRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Bounded start-page evidence; both routes are read-only and use existing log query authorization. */
@RestController
@RequestMapping(path = "/api/logs/repeated-errors", produces = "application/json")
public class LogRepeatedErrorsController {
    private static final Set<String> WINDOW_KEYS = Set.of("start", "end", "serviceName", "environment", "source");
    private static final Set<String> RECORD_KEYS = Set.of("start", "end", "serviceName", "environment", "source",
            "groupKey", "representativeUid");
    private final List<RepeatedErrorRepository> readers;
    private final ObservabilityQueryAdmissionService admission;

    public LogRepeatedErrorsController(List<RepeatedErrorRepository> readers, ObservabilityQueryAdmissionService admission) {
        this.readers = List.copyOf(readers);
        this.admission = admission;
    }

    @GetMapping
    public ResponseEntity<Message<LogRepeatedErrors.Result>> summary(@RequestParam Map<String, String> parameters) {
        var scope = scope(parameters, WINDOW_KEYS);
        var result = admission.execute("logs", () -> readers.size() == 1 ? readers.getFirst().summary(scope)
                : LogRepeatedErrors.unavailable("unsupported", scope));
        return ResponseEntity.ok(Message.success(result));
    }

    @GetMapping("/records")
    public ResponseEntity<Message<LogRepeatedErrors.Records>> records(@RequestParam Map<String, String> parameters) {
        var scope = scope(parameters, RECORD_KEYS);
        LogRepeatedErrors.Selection selection;
        try {
            selection = new LogRepeatedErrors.Selection(parameters.get("groupKey"), parameters.get("representativeUid"));
        } catch (IllegalArgumentException invalid) {
            throw new ObservabilityQueryRequestException();
        }
        var result = admission.execute("logs", () -> readers.size() == 1 ? readers.getFirst().records(scope, selection)
                : new LogRepeatedErrors.Records("unsupported", scope, selection, List.of()));
        return ResponseEntity.ok(Message.success(result));
    }

    private static LogRepeatedErrors.Scope scope(Map<String, String> parameters, Set<String> allowed) {
        var workspace = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspace)) throw new TelemetryStorageUnavailableException();
        try {
            if (!allowed.containsAll(parameters.keySet())) throw new IllegalArgumentException();
            long start = Long.parseLong(parameters.get("start"));
            long end = Long.parseLong(parameters.get("end"));
            Math.multiplyExact(end, 1000000L);
            return new LogRepeatedErrors.Scope(AuthTokenScopes.normalizeWorkspaceId(workspace), start, end,
                    parameters.get("serviceName"), parameters.get("environment"));
        } catch (IllegalArgumentException | ArithmeticException invalid) {
            throw new ObservabilityQueryRequestException();
        }
    }
}
