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

package org.apache.hertzbeat.manager.ui.runtime;

import java.time.Clock;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.CollectorsStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ComponentStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ErrorCode;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.RuntimeStatusResponse;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.State;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.StorageKind;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.StorageStatus;
import org.springframework.stereotype.Service;

/** Contract-only M1 response until the runtime-status aggregation is implemented. */
@Service
final class UnavailableUiRuntimeStatusQuery implements UiRuntimeStatusQuery {

    private final Clock clock = Clock.systemUTC();

    @Override
    public RuntimeStatusResponse current() {
        return new RuntimeStatusResponse(
                UiRuntimeStatusContract.CURRENT_SCHEMA_VERSION,
                clock.instant(),
                new ComponentStatus(State.UNKNOWN, ErrorCode.RUNTIME_STATUS_NOT_IMPLEMENTED),
                new StorageStatus(
                        StorageKind.GREPTIME,
                        State.UNKNOWN,
                        ErrorCode.RUNTIME_STATUS_NOT_IMPLEMENTED),
                new CollectorsStatus(
                        State.UNKNOWN,
                        null,
                        null,
                        null,
                        null,
                        ErrorCode.RUNTIME_STATUS_NOT_IMPLEMENTED));
    }
}
