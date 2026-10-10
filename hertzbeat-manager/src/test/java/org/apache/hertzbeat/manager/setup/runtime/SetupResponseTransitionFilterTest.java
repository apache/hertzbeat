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

package org.apache.hertzbeat.manager.setup.runtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore.Intent;
import org.apache.hertzbeat.manager.setup.workflow.SetupConfigurationCoordinator;
import org.apache.hertzbeat.manager.setup.workflow.SetupOptionsCoordinator;
import org.apache.hertzbeat.manager.setup.workflow.SetupRequestValidator;
import org.apache.hertzbeat.manager.setup.workflow.SetupRuntimeState;
import org.apache.hertzbeat.manager.setup.workflow.SetupTransitionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SetupResponseTransitionFilterTest {
    @TempDir
    private Path installationRoot;

    @Test
    void configurationTransitionRunsOnlyAfterResponseCommitAndApplicationReadiness() throws Exception {
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        List<Runnable> tasks = new ArrayList<>();
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, mock(SetupTransitionIntentStore.class), (task, ignored) -> tasks.add(task));
        SetupResponseTransition marker = new SetupResponseTransition();
        SetupResponseTransitionFilter filter = new SetupResponseTransitionFilter(scheduler, marker);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/setup/configuration");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            marker.arm(servletRequest);
            servletResponse.getWriter().write("accepted");
        });

        assertThat(response.isCommitted()).isTrue();
        assertThat(tasks).isEmpty();
        verify(transition, never()).configurationApplied();

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        assertThat(tasks).hasSize(1);
        tasks.removeFirst().run();
        verify(transition).configurationApplied();
    }

    @Test
    void committedIntentSurvivesResponseFlushFailureAndStillWakesTransition() throws Exception {
        FileSetupTransitionIntentStore intents = new FileSetupTransitionIntentStore(installationRoot);
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        List<Runnable> tasks = new ArrayList<>();
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                transition, intents, (task, ignored) -> tasks.add(task));
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCAL, false, null);
        SetupConfigurationCoordinator configuration = mock(SetupConfigurationCoordinator.class);
        SetupTransitionService.ConfigurationCommand command =
                mock(SetupTransitionService.ConfigurationCommand.class);
        when(command.expectedPhase()).thenReturn(SetupPhase.CONFIGURATION_REQUIRED);
        when(command.configure(configuration, capability)).thenReturn(new ConfigurationResponse(
                "operation", SetupOperationState.AWAITING_RESTART,
                SetupPhase.APPLICATION_STARTING, 1_000, false));
        SetupTransitionService transitions = new SetupTransitionService(
                state, mock(SetupRequestValidator.class), configuration, capability,
                mock(SetupOptionsCoordinator.class), Optional.empty(), Optional.empty(), intents);
        SetupResponseTransition marker = new SetupResponseTransition();
        SetupResponseTransitionFilter filter = new SetupResponseTransitionFilter(scheduler, marker);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/setup/configuration");
        HttpServletResponse response = mock(HttpServletResponse.class);
        doThrow(new IOException("client disconnected")).when(response).flushBuffer();

        assertThrows(IOException.class, () -> filter.doFilter(request, response, (servletRequest, ignored) -> {
            transitions.configure(command);
            marker.arm(servletRequest);
        }));

        assertThat(state.phase()).isEqualTo(SetupPhase.APPLICATION_STARTING);
        assertThat(intents.load()).contains(Intent.CONFIGURATION_APPLIED);
        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        assertThat(tasks).hasSize(1);
    }

    @Test
    void armedIntentWakesExactlyOnceWhenResponseSerializationFails() throws Exception {
        List<Exception> failures = List.of(
                new IOException("response write failed"),
                new ServletException("response serialization failed"));
        for (int index = 0; index < failures.size(); index++) {
            Exception responseFailure = failures.get(index);
            Path root = installationRoot.resolve("failure-" + index);
            FileSetupTransitionIntentStore intents = new FileSetupTransitionIntentStore(root);
            intents.save(Intent.CONFIGURATION_APPLIED);
            SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
            List<Runnable> tasks = new ArrayList<>();
            SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(
                    transition, intents, (task, ignored) -> tasks.add(task));
            SetupResponseTransition marker = new SetupResponseTransition();
            SetupResponseTransitionFilter filter = new SetupResponseTransitionFilter(scheduler, marker);
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/setup/configuration");

            Throwable propagated = assertThrows(responseFailure.getClass(),
                    () -> filter.doFilter(request, new MockHttpServletResponse(), (servletRequest, ignored) -> {
                        marker.arm(servletRequest);
                        if (responseFailure instanceof IOException writeFailure) {
                            throw writeFailure;
                        }
                        throw (ServletException) responseFailure;
                    }));

            assertThat(propagated).isSameAs(responseFailure);
            assertThat(intents.load()).contains(Intent.CONFIGURATION_APPLIED);
            assertThat(tasks).isEmpty();

            scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
            assertThat(tasks).hasSize(1);
            tasks.removeFirst().run();

            verify(transition).configurationApplied();
            assertThat(tasks).isEmpty();
        }
    }
}
