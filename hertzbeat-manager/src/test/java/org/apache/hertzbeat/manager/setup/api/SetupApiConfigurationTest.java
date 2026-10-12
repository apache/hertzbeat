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

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.runtime.FactoryResetStateStore.State;
import org.junit.jupiter.api.Test;

class SetupApiConfigurationTest {

    @Test
    void defaultAndBlankBindAddressesMustRequireRemoteUnlock() {
        assertThat(SetupApiConfiguration.bindAddress(null).isAnyLocalAddress()).isTrue();
        assertThat(SetupApiConfiguration.bindAddress("  ").isAnyLocalAddress()).isTrue();
    }

    @Test
    void explicitLoopbackAddressMustRemainLocal() {
        assertThat(SetupApiConfiguration.bindAddress("127.0.0.1").isLoopbackAddress()).isTrue();
    }

    @Test
    void pendingFactoryResetMustBlockOrdinaryCompletedInstallationConvergence() {
        assertThat(SetupApiConfiguration.installationConvergenceAllowed(
                RuntimeMode.FULL_SETUP_GATED, SetupPhase.COMPLETE, Optional.of(State.REQUESTED))).isFalse();
        assertThat(SetupApiConfiguration.installationConvergenceAllowed(
                RuntimeMode.FULL_SETUP_GATED, SetupPhase.COMPLETE, Optional.of(State.CLEANED))).isFalse();
        assertThat(SetupApiConfiguration.installationConvergenceAllowed(
                RuntimeMode.FULL_SETUP_GATED, SetupPhase.COMPLETE, Optional.empty())).isTrue();
    }
}
