/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.ui.session;

import java.time.Instant;
import java.util.List;

/**
 * Browser-safe UI session metadata. This type never contains token material.
 */
public record UiSessionView(
        boolean authenticated,
        String username,
        List<String> roles,
        String workspaceId,
        Instant expiresAt) {

    public UiSessionView {
        roles = roles == null ? List.of() : List.copyOf(roles);
    }

    public static UiSessionView anonymous() {
        return new UiSessionView(false, null, List.of(), null, null);
    }
}
