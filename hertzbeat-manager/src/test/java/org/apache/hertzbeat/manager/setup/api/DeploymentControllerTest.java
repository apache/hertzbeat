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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationExportRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportFormat;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.workflow.MigrationExportRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** Transport proof for authenticated, no-store deployment routes. */
class DeploymentControllerTest {

    private final DeploymentWorkflow workflow = mock(DeploymentWorkflow.class);
    private final MigrationExportRenderer exportRenderer = mock(MigrationExportRenderer.class);
    private ObjectProvider<DeploymentWorkflow> workflowProvider;
    private ObjectProvider<MigrationExportRenderer> rendererProvider;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        StaticListableBeanFactory factory = providerFactory(List.of(workflow), List.of(exportRenderer));
        workflowProvider = factory.getBeanProvider(DeploymentWorkflow.class);
        rendererProvider = factory.getBeanProvider(MigrationExportRenderer.class);
        mvc = mvc(workflowProvider, rendererProvider);
    }

    @Test
    void routesValidationCreationPollingAndActivationWithoutStoringResponses() throws Exception {
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
                {"target":"mysql","targetDatabase":{"kind":"mysql",
                "jdbcUrl":"jdbc:mysql://db/hertzbeat","username":"operator","password":"request-secret"},
                "applyMode":"managed_write"}
                """;

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
    void missingMigrationPollIsAnExplicitNotFound() throws Exception {
        when(workflow.migration("missing")).thenReturn(null);

        mvc.perform(get(DeploymentApiContract.MIGRATION_OPERATION_PATH, "missing"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("operation_not_found"));
    }

    @Test
    void missingWorkflowReturnsStableNoStoreUnavailable() throws Exception {
        assertDeploymentUnavailable(mvc(List.of(), List.of(exportRenderer)));
    }

    @Test
    void ambiguousWorkflowReturnsStableNoStoreUnavailable() throws Exception {
        assertDeploymentUnavailable(mvc(
                List.of(workflow, mock(DeploymentWorkflow.class)), List.of(exportRenderer)));
    }

    @Test
    void missingOrAmbiguousRendererReturnsStableNoStoreUnavailable() throws Exception {
        assertExportUnavailable(mvc(List.of(workflow), List.of()));
        assertExportUnavailable(mvc(List.of(workflow),
                List.of(exportRenderer, mock(MigrationExportRenderer.class))));
    }

    @Test
    void externalApplyExportStreamsOnlyAfterNoStoreAttachmentIsPrepared() throws Exception {
        when(workflow.prepareExport(eq("migration-1"), any())).thenReturn(
                new ExportResponse("hertzbeat-migration.env", "text/plain"));
        String request = """
                {"format":"env","expectedState":"awaiting_external_apply",
                "targetDatabase":{"kind":"mysql","jdbcUrl":"jdbc:mysql://db/hertzbeat",
                "username":"operator","password":"export-secret"}}
                """;

        MvcResult pending = mvc.perform(post(DeploymentApiContract.EXPORT_PATH, "migration-1")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(request().asyncStarted()).andReturn();
        mvc.perform(asyncDispatch(pending))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"hertzbeat-migration.env\""));
        verify(exportRenderer).write(eq("migration-1"), any(), any());
    }

    @Test
    void exportBodyIsDeferredUntilTheStreamingCallbackRuns() throws Exception {
        MigrationExportRequest request = new MigrationExportRequest(ExportFormat.ENV,
                MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db/hertzbeat", "operator", "export-secret"));
        when(workflow.prepareExport("migration-1", request)).thenReturn(
                new ExportResponse("hertzbeat-migration.env", "text/plain"));
        DeploymentController controller = new DeploymentController(workflowProvider, rendererProvider);

        ResponseEntity<StreamingResponseBody> response = controller.export("migration-1", request);

        verifyNoInteractions(exportRenderer);
        response.getBody().writeTo(new ByteArrayOutputStream());
        verify(exportRenderer).write(eq("migration-1"), eq(request), any());
    }

    private MigrationView readyMigration() {
        return new MigrationView("migration-1", MigrationOperationState.READY_TO_ACTIVATE,
                SetupApiContract.MetadataDatabaseKind.H2, MigrationTarget.MYSQL,
                MigrationStage.READY_TO_ACTIVATE, 100, Instant.parse("2026-08-09T00:00:00Z"),
                Instant.parse("2026-08-09T00:00:01Z"), null,
                VerificationState.SUCCEEDED, null, 0, true, false, false);
    }

    private MigrationView restartingMigration() {
        return new MigrationView("migration-1", MigrationOperationState.AWAITING_RESTART,
                SetupApiContract.MetadataDatabaseKind.H2, MigrationTarget.MYSQL,
                MigrationStage.AWAITING_RESTART, 100, Instant.parse("2026-08-09T00:00:00Z"),
                Instant.parse("2026-08-09T00:00:01Z"), null,
                VerificationState.SUCCEEDED, null, 1000, false, true, false);
    }

    private MockMvc mvc(
            List<DeploymentWorkflow> workflows, List<MigrationExportRenderer> renderers) {
        StaticListableBeanFactory factory = providerFactory(workflows, renderers);
        return mvc(factory.getBeanProvider(DeploymentWorkflow.class),
                factory.getBeanProvider(MigrationExportRenderer.class));
    }

    private MockMvc mvc(
            ObjectProvider<DeploymentWorkflow> workflows,
            ObjectProvider<MigrationExportRenderer> renderers) {
        return MockMvcBuilders.standaloneSetup(new DeploymentController(workflows, renderers))
                .setControllerAdvice(new SetupExceptionHandler()).build();
    }

    private StaticListableBeanFactory providerFactory(
            List<DeploymentWorkflow> workflows, List<MigrationExportRenderer> renderers) {
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int index = 0; index < workflows.size(); index++) {
            factory.addBean("workflow-" + index, workflows.get(index));
        }
        for (int index = 0; index < renderers.size(); index++) {
            factory.addBean("renderer-" + index, renderers.get(index));
        }
        return factory;
    }

    private void assertDeploymentUnavailable(MockMvc candidate) throws Exception {
        candidate.perform(get(DeploymentApiContract.DEPLOYMENT_PATH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("migration_unavailable"));
    }

    private void assertExportUnavailable(MockMvc candidate) throws Exception {
        String request = """
                {"format":"env","expectedState":"awaiting_external_apply",
                "targetDatabase":{"kind":"mysql","jdbcUrl":"jdbc:mysql://db/hertzbeat",
                "username":"operator","password":"export-secret"}}
                """;
        candidate.perform(post(DeploymentApiContract.EXPORT_PATH, "migration-1")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("migration_unavailable"));
    }
}
