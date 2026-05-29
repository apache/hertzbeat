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

package org.apache.hertzbeat.common.observability.gateway;

import org.apache.commons.lang3.StringUtils;

/**
 * Per-request authentication boundary for downstream workspace-aware services.
 */
public final class AuthTokenRequestContext {

    private static final ThreadLocal<String> WORKSPACE_ID = new ThreadLocal<>();

    private AuthTokenRequestContext() {
    }

    public static void bindWorkspaceId(String workspaceId) {
        String normalized = StringUtils.trimToNull(workspaceId);
        if (normalized == null) {
            clear();
            return;
        }
        WORKSPACE_ID.set(AuthTokenScopes.normalizeWorkspaceId(normalized));
    }

    public static String currentWorkspaceId() {
        return WORKSPACE_ID.get();
    }

    public static void clear() {
        WORKSPACE_ID.remove();
    }
}
