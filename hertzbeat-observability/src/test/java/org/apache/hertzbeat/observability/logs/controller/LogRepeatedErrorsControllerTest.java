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

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.repository.RepeatedErrorRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LogRepeatedErrorsControllerTest {
    private final Map<String, String> window = Map.of("start", "1000", "end", "901000");
    private final RepeatedErrorRepository reader = mock(RepeatedErrorRepository.class);
    private final ObservabilityQueryAdmissionService admission =
            new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO);

    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void refusesMissingTrustedWorkspaceBeforeStorageRead() {
        var controller = new LogRepeatedErrorsController(List.of(reader), admission);
        assertThrows(TelemetryStorageUnavailableException.class, () -> controller.summary(window));
        verifyNoInteractions(reader);
    }

    @Test
    void rejectsUnknownFiltersAndInvalidWindowsWithoutBroadeningRead() {
        AuthTokenRequestContext.bindWorkspaceId("authorized");
        var controller = new LogRepeatedErrorsController(List.of(reader), admission);
        for (var invalid : List.of(Map.of("start", "1000", "end", "902000"),
                Map.of("start", "1000", "end", "2000", "workspaceId", "other"),
                Map.of("start", "1000", "end", "2000", "body", "secret"),
                Map.of("start", "-1", "end", "2000"), Map.of("start", "x", "end", "2000"))) {
            assertThrows(ObservabilityQueryRequestException.class, () -> controller.summary(invalid));
        }
        verifyNoInteractions(reader);
    }

    @Test
    void dispatchesOnlyServerTrustedWorkspaceAndExactRequestedWindow() {
        AuthTokenRequestContext.bindWorkspaceId("authorized");
        var controller = new LogRepeatedErrorsController(List.of(reader), admission);
        var scope = new LogRepeatedErrors.Scope("authorized", 1000, 901000, "api", "prod");
        when(reader.summary(any())).thenReturn(new LogRepeatedErrors.Result("ready", scope, "window", 0L, List.of()));
        assertEquals("ready", controller.summary(Map.of("start", "1000", "end", "901000",
                "serviceName", "api", "environment", "prod")).getBody().getData().state());
        verify(reader).summary(scope);
    }

    @Test
    void unconfiguredStoreReportsUnsupportedInsteadOfEmptyHealthyEvidence() {
        AuthTokenRequestContext.bindWorkspaceId("authorized");
        var controller = new LogRepeatedErrorsController(List.of(), admission);
        var result = controller.summary(window).getBody().getData();
        assertEquals("unsupported", result.state());
        assertEquals(null, result.matchingEvents());
    }

    @Test
    void drillsDownWithOpaqueGroupAndRepresentativeIdentityOnly() {
        AuthTokenRequestContext.bindWorkspaceId("authorized");
        var controller = new LogRepeatedErrorsController(List.of(reader), admission);
        var scope = new LogRepeatedErrors.Scope("authorized", 1000, 901000, null, null);
        var selection = new LogRepeatedErrors.Selection("a".repeat(64), "record-1");
        when(reader.records(scope, selection)).thenReturn(new LogRepeatedErrors.Records("missing", scope, selection, List.of()));
        assertEquals("missing", controller.records(Map.of("start", "1000", "end", "901000",
                "groupKey", selection.groupKey(), "representativeUid", selection.representativeUid())).getBody().getData().state());
        verify(reader).records(scope, selection);
    }
}
