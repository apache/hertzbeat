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

package org.apache.hertzbeat.manager.setup.config;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;

/** Deployment-aware configuration application capability. */
public record ManagedConfigCapability(
        ApplyMode applyMode,
        boolean writableManagedConfig,
        DeploymentConstraint constraint) {

    public ManagedConfigCapability {
        Objects.requireNonNull(applyMode, "applyMode");
        Objects.requireNonNull(constraint, "constraint");
        if (writableManagedConfig != (applyMode == ApplyMode.MANAGED_WRITE)
                || writableManagedConfig != (constraint == DeploymentConstraint.NONE)) {
            throw new IllegalArgumentException("Managed write capability is inconsistent");
        }
    }

    static ManagedConfigCapability writable() {
        return new ManagedConfigCapability(ApplyMode.MANAGED_WRITE, true, DeploymentConstraint.NONE);
    }

    static ManagedConfigCapability constrained(DeploymentConstraint constraint) {
        return new ManagedConfigCapability(ApplyMode.EXTERNAL_APPLY, false, constraint);
    }
}
