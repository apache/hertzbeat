/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationExportRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportFormat;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.workflow.PreparedMigrationExport;
import org.apache.hertzbeat.manager.setup.workflow.StagedMigrationExport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Bounded synchronous export and servlet failure contracts for deployment routes. */
class DeploymentControllerExportTest {

    private final DeploymentWorkflow workflow = mock(DeploymentWorkflow.class);
    private ObjectProvider<DeploymentWorkflow> workflowProvider;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        factory.addBean("workflow", workflow);
        workflowProvider = factory.getBeanProvider(DeploymentWorkflow.class);
        mvc = MockMvcBuilders.standaloneSetup(new DeploymentController(workflowProvider))
                .setControllerAdvice(new SetupExceptionHandler()).build();
    }

    @Test
    void externalApplyExportWritesOnlyAfterNoStoreAttachmentIsPrepared() throws Exception {
        ExportFixture fixture = fixture();
        when(workflow.prepareExport(eq("migration-1"), any())).thenReturn(fixture.prepared);
        String request = """
                {"format":"env","expectedState":"awaiting_external_apply",
                "targetDatabase":{"kind":"mysql","jdbcUrl":"jdbc:mysql://db/hertzbeat",
                "username":"operator","password":"export-secret"}}
                """;

        mvc.perform(post(DeploymentApiContract.EXPORT_PATH, "migration-1")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"hertzbeat-migration.env\""));

        verify(fixture.staged).writeTo(any());
        verify(fixture.staged).close();
        verify(fixture.prepared).close();
    }

    @Test
    void exportBodyIsWrittenSynchronouslyWithoutCapturingTheRequest() throws Exception {
        ExportFixture fixture = fixture();

        fixture.controller.export("migration-1", fixture.request, fixture.response);

        verify(fixture.prepared).stage();
        verify(fixture.staged).metadata();
        verify(fixture.staged).writeTo(fixture.output);
        verify(fixture.response).flushBuffer();
        verify(fixture.staged).close();
        verify(fixture.prepared).close();
    }

    @Test
    void renderFailureClosesPreparedWithoutMutatingTheServletResponse() throws Exception {
        MigrationExportRequest request = exportRequest();
        PreparedMigrationExport prepared = mock(PreparedMigrationExport.class);
        when(workflow.prepareExport("migration-1", request)).thenReturn(prepared);
        when(prepared.stage()).thenThrow(new IOException("Prepared migration export failed"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        DeploymentController controller = new DeploymentController(workflowProvider);

        assertThatThrownBy(() -> controller.export("migration-1", request, response))
                .isInstanceOf(IOException.class)
                .hasMessageNotContaining("export-secret");

        verify(prepared).close();
        verifyNoInteractions(response);
    }

    @Test
    void outputFailureClosesPreparedExportAndResetsAnUncommittedResponse() throws Exception {
        ExportFixture fixture = fixture();
        IOException outputFailure = new IOException("private-output-detail");
        when(fixture.response.isCommitted()).thenReturn(false);
        org.mockito.Mockito.doThrow(outputFailure).when(fixture.staged).writeTo(fixture.output);

        assertThatThrownBy(() -> fixture.controller.export(
                "migration-1", fixture.request, fixture.response)).isSameAs(outputFailure);

        verify(fixture.response).reset();
        verify(fixture.staged).close();
        verify(fixture.prepared).close();
    }

    @Test
    void committedTransportFailureDoesNotAttemptToResetTheResponse() throws Exception {
        ExportFixture fixture = fixture();
        IOException outputFailure = new IOException("private-output-detail");
        when(fixture.response.isCommitted()).thenReturn(true);
        org.mockito.Mockito.doThrow(outputFailure).when(fixture.staged).writeTo(fixture.output);

        assertThatThrownBy(() -> fixture.controller.export(
                "migration-1", fixture.request, fixture.response)).isSameAs(outputFailure);

        verify(fixture.response, never()).reset();
        verify(fixture.staged).close();
        verify(fixture.prepared).close();
    }

    @Test
    void ordinaryResponseRuntimeAtEveryMutationBoundaryResetsWithoutReplacingFailure() throws Exception {
        for (ResponseFailurePoint failurePoint : ResponseFailurePoint.values()) {
            ExportFixture fixture = fixture();
            when(fixture.response.isCommitted()).thenReturn(false);
            IllegalStateException failure = new IllegalStateException("private-response-runtime");
            failurePoint.fail(fixture, failure);

            assertThatThrownBy(() -> fixture.controller.export(
                    "migration-1", fixture.request, fixture.response)).isSameAs(failure);

            verify(fixture.response).reset();
            verify(fixture.staged).close();
            verify(fixture.prepared).close();
        }
    }

    @Test
    void rollbackRuntimeNeverReplacesTheOriginalResponseFailure() throws Exception {
        for (boolean failCommittedCheck : List.of(true, false)) {
            ExportFixture fixture = fixture();
            IllegalStateException original = new IllegalStateException("original-response-failure");
            org.mockito.Mockito.doThrow(original).when(fixture.staged).writeTo(fixture.output);
            if (failCommittedCheck) {
                when(fixture.response.isCommitted())
                        .thenThrow(new IllegalStateException("private-committed-failure"));
            } else {
                when(fixture.response.isCommitted()).thenReturn(false);
                org.mockito.Mockito.doThrow(new IllegalStateException("private-reset-failure"))
                        .when(fixture.response).reset();
            }

            assertThatThrownBy(() -> fixture.controller.export(
                    "migration-1", fixture.request, fixture.response)).isSameAs(original);
        }
    }

    @Test
    void fatalResponseErrorRemainsRawAndPrimary() throws Exception {
        ExportFixture fixture = fixture();
        AssertionError fatal = new AssertionError("response-fatal");
        org.mockito.Mockito.doThrow(fatal).when(fixture.response)
                .setHeader("Cache-Control", "no-store");

        assertThatThrownBy(() -> fixture.controller.export(
                "migration-1", fixture.request, fixture.response)).isSameAs(fatal);

        verify(fixture.response, never()).isCommitted();
        verify(fixture.response, never()).reset();
        verify(fixture.staged).close();
        verify(fixture.prepared).close();
    }

    private ExportFixture fixture() throws Exception {
        MigrationExportRequest request = exportRequest();
        PreparedMigrationExport prepared = mock(PreparedMigrationExport.class);
        StagedMigrationExport staged = mock(StagedMigrationExport.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        ServletOutputStream output = mock(ServletOutputStream.class);
        when(prepared.stage()).thenReturn(staged);
        when(staged.metadata()).thenReturn(
                new ExportResponse("hertzbeat-migration.env", "text/plain"));
        when(staged.size()).thenReturn(8);
        when(workflow.prepareExport("migration-1", request)).thenReturn(prepared);
        when(response.getOutputStream()).thenReturn(output);
        return new ExportFixture(request, prepared, staged, response, output,
                new DeploymentController(workflowProvider));
    }

    private MigrationExportRequest exportRequest() {
        return new MigrationExportRequest(ExportFormat.ENV,
                MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db/hertzbeat", "operator", "export-secret"));
    }

    private record ExportFixture(
            MigrationExportRequest request,
            PreparedMigrationExport prepared,
            StagedMigrationExport staged,
            HttpServletResponse response,
            ServletOutputStream output,
            DeploymentController controller) { }

    private enum ResponseFailurePoint {
        HEADER {
            @Override
            void fail(ExportFixture fixture, RuntimeException failure) {
                org.mockito.Mockito.doThrow(failure).when(fixture.response)
                        .setHeader("Cache-Control", "no-store");
            }
        },
        OUTPUT_STREAM {
            @Override
            void fail(ExportFixture fixture, RuntimeException failure) throws IOException {
                when(fixture.response.getOutputStream()).thenThrow(failure);
            }
        },
        WRITE {
            @Override
            void fail(ExportFixture fixture, RuntimeException failure) throws IOException {
                org.mockito.Mockito.doThrow(failure).when(fixture.staged).writeTo(fixture.output);
            }
        };

        abstract void fail(ExportFixture fixture, RuntimeException failure) throws IOException;
    }
}
