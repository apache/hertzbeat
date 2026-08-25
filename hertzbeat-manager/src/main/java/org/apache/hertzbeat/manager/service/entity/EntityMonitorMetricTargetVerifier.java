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

package org.apache.hertzbeat.manager.service.entity;

import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Recomputes and compares the current authority for a persisted canonical target. */
@Service
public class EntityMonitorMetricTargetVerifier {

    private final EntityMonitorMetricTargetCanonicalizer canonicalizer;

    public EntityMonitorMetricTargetVerifier(EntityMonitorMetricTargetCanonicalizer canonicalizer) {
        this.canonicalizer = canonicalizer;
    }

    /**
     * Returns false without exposing manager failures when current authority cannot be proven exactly.
     * Fatal JVM errors retain their normal propagation semantics.
     */
    public boolean verify(String workspaceId, EntityMonitorMetricTargetCanonicalizer.CanonicalTarget expected) {
        if (!StringUtils.hasText(workspaceId) || expected == null || Thread.currentThread().isInterrupted()) {
            return false;
        }
        try {
            var signal = expected.signal();
            if (signal == null) {
                return false;
            }
            var current = canonicalizer.canonicalize(workspaceId,
                    new EntityMonitorMetricTargetCanonicalizer.SourceIntent(
                            expected.monitorId(), signal.type(), signal.query(), signal.start(), signal.end(),
                            signal.timezone()));
            return !Thread.currentThread().isInterrupted() && Objects.equals(expected, current);
        } catch (RuntimeException ignored) {
            return false;
        } catch (Error failure) {
            if (isFatal(failure)) {
                throw failure;
            }
            return false;
        }
    }

    private boolean isFatal(Error failure) {
        return failure instanceof VirtualMachineError
                || failure instanceof ThreadDeath
                || failure instanceof LinkageError;
    }
}
