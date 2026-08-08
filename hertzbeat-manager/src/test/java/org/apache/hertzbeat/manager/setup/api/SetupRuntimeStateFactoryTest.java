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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.InetAddress;
import java.nio.file.Path;
import java.util.Optional;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

class SetupRuntimeStateFactoryTest {
    @TempDir
    private Path root;

    @Test
    void recoveryRuntimePublishesTheStableManagedRecoveryReason() throws Exception {
        BusinessRuntimeGate gate = mock(BusinessRuntimeGate.class);
        when(gate.mode()).thenReturn(RuntimeMode.RECOVERY);

        var state = new SetupRuntimeStateFactory().create(new MockEnvironment(), root,
                InetAddress.getLoopbackAddress(), gate, mock(ManagedConfigCapability.class),
                Optional.empty(), Optional.empty());

        assertThat(state.status().phase()).isEqualTo(SetupPhase.RECOVERY_REQUIRED);
        assertThat(state.status().errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }
}
