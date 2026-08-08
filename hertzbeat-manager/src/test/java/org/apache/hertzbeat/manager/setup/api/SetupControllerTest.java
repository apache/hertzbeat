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

package org.apache.hertzbeat.manager.setup.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockResponse;
import org.apache.hertzbeat.manager.setup.security.SetupUnlockRejected;
import org.apache.hertzbeat.manager.setup.security.SetupHttpUnlockService;
import org.apache.hertzbeat.manager.setup.runtime.SetupResponseTransition;
import org.apache.hertzbeat.manager.setup.workflow.SetupExportRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SetupControllerTest {

    private final SetupWorkflow workflow = mock(SetupWorkflow.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new SetupController(workflow,
                        mock(SetupHttpUnlockService.class), mock(SetupResponseTransition.class),
                        new SetupExportRenderer()))
                .setControllerAdvice(new SetupExceptionHandler()).build();
    }

    @Test
    void exposesSafeNoStoreStatus() throws Exception {
        when(workflow.status()).thenReturn(new StatusResponse(
                SetupPhase.CONFIGURATION_REQUIRED, Instant.parse("2026-08-08T00:00:00Z"),
                SetupAccess.LOCAL, ApplyMode.MANAGED_WRITE, true, null, null,
                new ManagementDatabaseSummary(MetadataDatabaseKind.H2, false,
                        ConfigSource.BUILT_IN_DEFAULT, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, false,
                        ConfigSource.BUILT_IN_DEFAULT, false),
                false, new OptionalConfigurationSummary(false, false, false, false, false)));

        mvc.perform(get(SetupApiContract.STATUS_PATH))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.phase").value("configuration_required"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("jdbc"))));
    }

    @Test
    void routesEveryFrozenMutationAndOperationPath() throws Exception {
        when(workflow.unlock(any())).thenReturn(new UnlockResponse(
                SetupAccess.UNLOCKED, Instant.parse("2026-08-08T00:15:00Z")));

        mvc.perform(post(SetupApiContract.UNLOCK_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"one-time-proof\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.access").value("unlocked"));

        mvc.perform(get(SetupApiContract.OPERATION_PATH, "missing"))
                .andExpect(status().isNotFound()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("operation_not_found"));
    }

    @Test
    void mapsUnlockRejectionsWithoutExceptionDetails() throws Exception {
        when(workflow.unlock(any())).thenThrow(new SetupUnlockRejected(SetupUnlockRejected.Reason.RATE_LIMITED));

        mvc.perform(post(SetupApiContract.UNLOCK_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"invalid-proof\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("setup_rate_limited"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("exception"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("invalid-proof"))));
    }

    @Test
    void mapsMalformedInputToStableSafeError() throws Exception {
        mvc.perform(post(SetupApiContract.UNLOCK_PATH).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("invalid_request"));
    }

    @Test
    void exportIsActualNoStoreAttachmentRatherThanMetadataJson() throws Exception {
        when(workflow.prepareExport(any())).thenReturn(
                new ExportResponse("hertzbeat-setup.env", "text/plain"));
        String request = """
                {"format":"env","configuration":{"expectedPhase":"configuration_required",
                "applyMode":"external_apply","managementDatabase":{"kind":"h2",
                "jdbcUrl":"jdbc:h2:./data/hertzbeat","username":"sa","password":"database-secret"},
                "telemetryStore":{"kind":"greptime","grpcEndpoints":"localhost:4001",
                "httpEndpoint":"http://localhost:4000","database":"public"}}}
                """;

        var pending = mvc.perform(post(SetupApiContract.EXPORT_PATH)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(request().asyncStarted())
                .andReturn();
        mvc.perform(asyncDispatch(pending))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"hertzbeat-setup.env\""))
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string(org.hamcrest.Matchers.containsString(
                        "SPRING_DATASOURCE_PASSWORD=database-secret")));
    }

    @Test
    void unexpectedSetupFailureUsesStableNoStoreEnvelope() throws Exception {
        when(workflow.status()).thenThrow(new IllegalStateException("database-secret"));

        mvc.perform(get(SetupApiContract.STATUS_PATH))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("internal_error"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("database-secret"))));
    }

    @Test
    void typedSetupFailureKeepsItsDomainErrorCode() throws Exception {
        when(workflow.status()).thenThrow(
                new SetupApiException(SetupErrorCode.CONFIG_READ_ONLY, HttpStatus.CONFLICT));

        mvc.perform(get(SetupApiContract.STATUS_PATH))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("config_read_only"));
    }
}
