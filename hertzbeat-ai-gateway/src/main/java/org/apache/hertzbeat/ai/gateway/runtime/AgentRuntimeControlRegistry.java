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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * In-memory registry for active runtime controls.
 */
@Service
public class AgentRuntimeControlRegistry {

    private final ConcurrentMap<String, AgentRuntimeControl> controls = new ConcurrentHashMap<>();

    public AutoCloseable register(AgentRuntimeControl control) {
        // RuntimeService registers only controls created from a validated runtime context.
        Objects.requireNonNull(control, "control must not be null");
        String runUid = control.getRunUid();
        controls.put(runUid, control);
        return () -> controls.remove(runUid, control);
    }

    public boolean cancel(String runUid, String reason) {
        // RunCommandService resolves a concrete run before attempting active-control cancellation.
        if (!StringUtils.hasText(runUid)) {
            throw new IllegalArgumentException("runUid must not be blank");
        }
        AgentRuntimeControl control = controls.get(runUid);
        if (control == null) {
            return false;
        }
        // Cancellation reasons are optional user input; the control signal still requires a visible message.
        control.stop(StringUtils.hasText(reason) ? reason : "Runtime was cancelled.");
        return true;
    }

}
