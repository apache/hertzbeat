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
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Transport proof for authenticated, no-store deployment routes. */
class DeploymentControllerTest {

    private final DeploymentWorkflow workflow = mock(DeploymentWorkflow.class);
    private ObjectProvider<DeploymentWorkflow> workflowProvider;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        StaticListableBeanFactory factory = providerFactory(List.of(workflow));
        workflowProvider = factory.getBeanProvider(DeploymentWorkflow.class);
        mvc = mvc(workflowProvider);
    }

    @Test
    void routesValidationCreationPollingAndActivationWithoutStoringResponses() throws Exception {
        when(workflow.deployment()).thenReturn(deployment());
        when(workflow.validate(any())).thenReturn(new ValidationResponse(
                true, Instant.parse("2026-08-09T00:00:00Z"), null, List.of()));
        when(workflow.migrate(any())).thenReturn(readyMigration());
        when(workflow.migration("migration-1")).thenReturn(readyMigration());
        when(workflow.activate(eq("migration-1"), any())).thenReturn(restartingMigration());
        String target = """
                {"target":"mysql","targetDatabase":{"kind":"mysql",
                "jdbcUrl":"jdbc:mysql://db/hertzbeat","username":"operator","password":"request-secret"}}
                """;
        String migration = """
                {"operationId":"migration-1","target":"mysql","targetDatabase":{"kind":"mysql",
                "jdbcUrl":"jdbc:mysql://db/hertzbeat","username":"operator","password":"request-secret"},
                "applyMode":"managed_write"}
                """;

        mvc.perform(get(DeploymentApiContract.DEPLOYMENT_PATH))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.migration.allowed").value(false))
                .andExpect(jsonPath("$.migration.blockedBy").value("operation_conflict"))
                .andExpect(jsonPath("$.migration.maintenanceAdmission").value("unavailable"))
                .andExpect(jsonPath("$.migration.activeOperationId").value("migration-42"));
        mvc.perform(post(DeploymentApiContract.VALIDATE_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content(target))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("request-secret"))));
        mvc.perform(post(DeploymentApiContract.MIGRATION_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content(migration))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.activationAvailable").value(true));
        mvc.perform(get(DeploymentApiContract.MIGRATION_OPERATION_PATH, "migration-1"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.stage").value("ready_to_activate"));
        mvc.perform(post(DeploymentApiContract.ACTIVATE_PATH, "migration-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedState\":\"ready_to_activate\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.restartRequired").value(true));

        verify(workflow).migration("migration-1");
        verify(workflow).migrate(argThat(request -> "migration-1".equals(request.operationId())));
    }

    @Test
    void unexpectedFailuresExposeOnlyStableNoStoreEnvelope() throws Exception {
        when(workflow.migration("migration-1"))
                .thenThrow(new IllegalStateException("SELECT password FROM internal_table request-secret"));

        mvc.perform(get(DeploymentApiContract.MIGRATION_OPERATION_PATH, "migration-1"))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("internal_error"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("request-secret"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("internal_table"))));
    }

    @Test
    void metadataWriteAdmissionFailureUsesSafeRetryableEnvelope() throws Exception {
        when(workflow.deployment()).thenThrow(MetadataWriteAdmissionException.metadataWritesPaused());

        mvc.perform(get(DeploymentApiContract.DEPLOYMENT_PATH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("metadata_writes_paused"))
                .andExpect(jsonPath("$.message").value("Metadata writes are temporarily unavailable"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("operation-private"))));
    }

    @Test
    void missingMigrationPollIsAnExplicitNotFound() throws Exception {
        when(workflow.migration("missing")).thenReturn(null);

        mvc.perform(get(DeploymentApiContract.MIGRATION_OPERATION_PATH, "missing"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("operation_not_found"));
    }

    @Test
    void rejectsInvalidOperationIdsBeforeWorkflowDispatch() throws Exception {
        String migrationWithoutId = """
                {"target":"mysql","targetDatabase":{"kind":"mysql",
                "jdbcUrl":"jdbc:mysql://db/hertzbeat","username":"operator","password":"request-secret"},
                "applyMode":"managed_write"}
                """;
        String migrationWithUnsafeId = """
                {"operationId":".hidden","target":"mysql","targetDatabase":{"kind":"mysql",
                "jdbcUrl":"jdbc:mysql://db/hertzbeat","username":"operator","password":"request-secret"},
                "applyMode":"managed_write"}
                """;
        mvc.perform(post(DeploymentApiContract.MIGRATION_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content(migrationWithoutId))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("invalid_request"));
        mvc.perform(post(DeploymentApiContract.MIGRATION_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content(migrationWithUnsafeId))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("invalid_request"));
        mvc.perform(get(DeploymentApiContract.MIGRATION_OPERATION_PATH, ".hidden"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("invalid_request"));
        mvc.perform(post(DeploymentApiContract.ACTIVATE_PATH, "\u8fc1\u79fb")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedState\":\"ready_to_activate\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("invalid_request"));
        String exportRequest = """
                {"format":"env","expectedState":"awaiting_external_apply",
                "targetDatabase":{"kind":"mysql","jdbcUrl":"jdbc:mysql://db/hertzbeat",
                "username":"operator","password":"export-secret"}}
                """;
        mvc.perform(post(DeploymentApiContract.EXPORT_PATH, "a".repeat(129))
                        .contentType(MediaType.APPLICATION_JSON).content(exportRequest))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("invalid_request"));

        verifyNoInteractions(workflow);
    }

    @Test
    void missingWorkflowReturnsStableNoStoreUnavailable() throws Exception {
        assertDeploymentUnavailable(mvc(List.of()));
    }

    @Test
    void ambiguousWorkflowReturnsStableNoStoreUnavailable() throws Exception {
        assertDeploymentUnavailable(mvc(List.of(workflow, mock(DeploymentWorkflow.class))));
    }

    private MigrationView readyMigration() {
        return new MigrationView("migration-1", MigrationOperationState.READY_TO_ACTIVATE,
                SetupApiContract.MetadataDatabaseKind.H2, MigrationTarget.MYSQL,
                MigrationStage.READY_TO_ACTIVATE, 100, Instant.parse("2026-08-09T00:00:00Z"),
                Instant.parse("2026-08-09T00:00:01Z"), null,
                VerificationState.SUCCEEDED, null, 0, true, false, false);
    }

    private DeploymentView deployment() {
        return new DeploymentView(Instant.parse("2026-08-09T00:00:00Z"),
                new ManagementDatabaseSummary(MetadataDatabaseKind.H2, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                ApplyMode.MANAGED_WRITE, MaintenanceMode.ACTIVE, DeploymentTopology.SINGLE_NODE,
                MigrationCapability.blocked(SetupApiContract.SetupErrorCode.OPERATION_CONFLICT,
                        MaintenanceAdmission.UNAVAILABLE, "migration-42"));
    }

    private MigrationView restartingMigration() {
        return new MigrationView("migration-1", MigrationOperationState.AWAITING_RESTART,
                SetupApiContract.MetadataDatabaseKind.H2, MigrationTarget.MYSQL,
                MigrationStage.AWAITING_RESTART, 100, Instant.parse("2026-08-09T00:00:00Z"),
                Instant.parse("2026-08-09T00:00:01Z"), null,
                VerificationState.SUCCEEDED, null, 1000, false, true, false);
    }

    private MockMvc mvc(List<DeploymentWorkflow> workflows) {
        StaticListableBeanFactory factory = providerFactory(workflows);
        return mvc(factory.getBeanProvider(DeploymentWorkflow.class));
    }

    private MockMvc mvc(ObjectProvider<DeploymentWorkflow> workflows) {
        return MockMvcBuilders.standaloneSetup(new DeploymentController(workflows))
                .setControllerAdvice(new SetupExceptionHandler()).build();
    }

    private StaticListableBeanFactory providerFactory(List<DeploymentWorkflow> workflows) {
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int index = 0; index < workflows.size(); index++) {
            factory.addBean("workflow-" + index, workflows.get(index));
        }
        return factory;
    }

    private void assertDeploymentUnavailable(MockMvc candidate) throws Exception {
        candidate.perform(get(DeploymentApiContract.DEPLOYMENT_PATH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("migration_unavailable"));
    }

}
