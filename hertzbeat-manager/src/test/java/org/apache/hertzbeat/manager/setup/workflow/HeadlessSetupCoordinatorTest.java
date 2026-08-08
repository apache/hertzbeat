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

package org.apache.hertzbeat.manager.setup.workflow;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.junit.jupiter.api.Test;

class HeadlessSetupCoordinatorTest {
    @Test
    void completionRequiresTheSamePendingWarningAcknowledgementsAsBrowserSetup() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.OPTIONAL_CONFIGURATION, SetupAccess.LOCAL, true, "operator");
        state.optionsConfigured(new OptionalConfigurationSummary(true, false, false, false),
                List.of(SetupWarningCode.H2_NON_PRODUCTION,
                        SetupWarningCode.SERVER_OTLP_PLAINTEXT));
        SetupCompletionCoordinator completion = mock(SetupCompletionCoordinator.class);
        SetupTransitionService transitions = new SetupTransitionService(state,
                mock(SetupRequestValidator.class), mock(SetupConfigurationCoordinator.class), capability,
                Optional.of(mock(IdentityInitializationService.class)), Optional.of(completion));
        HeadlessSetupCoordinator coordinator = new HeadlessSetupCoordinator(
                state, new SetupMutationSerializer(), transitions);

        assertThrows(SetupApiException.class,
                () -> coordinator.complete(List.of(SetupWarningCode.H2_NON_PRODUCTION)));
        verifyNoInteractions(completion);

        coordinator.complete(List.of(SetupWarningCode.H2_NON_PRODUCTION,
                SetupWarningCode.SERVER_OTLP_PLAINTEXT));
        verify(completion).completeInstallation();
    }
}
