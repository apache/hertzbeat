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

package org.apache.hertzbeat.startup.runtime;

import java.util.Objects;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;

/** Safe startup classification produced before an application context is opened. */
public record StartupDecision(RuntimeMode mode, SetupPhase phase, SetupErrorCode errorCode) {

    public StartupDecision {
        Objects.requireNonNull(mode, "mode");
        Objects.requireNonNull(phase, "phase");
    }

    public static StartupDecision normal() {
        return new StartupDecision(RuntimeMode.NORMAL, SetupPhase.COMPLETE, null);
    }

    public static StartupDecision recovery() {
        return new StartupDecision(RuntimeMode.RECOVERY, SetupPhase.RECOVERY_REQUIRED,
                SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }
}
