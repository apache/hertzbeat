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

import java.util.Locale;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;

/**
 * Shared API token scope names and matching rules.
 */
public final class AuthTokenScopes {

    public static final String CLAIM_TOKEN_SCOPE = "token_scope";
    public static final String CLAIM_WORKSPACE_ID = "workspace_id";
    public static final String WORKSPACE_ID_HEADER = "X-HertzBeat-Workspace-Id";
    public static final String DEFAULT_WORKSPACE_ID = "default";
    public static final String UI_SESSION = "ui-session";
    public static final String API_ADMIN = "api-admin";
    public static final String READONLY_QUERY = "readonly-query";
    public static final String OTLP_INGEST = "otlp-ingest";

    private static final Set<String> API_TOKEN_SCOPES = Set.of(API_ADMIN, READONLY_QUERY, OTLP_INGEST);
    private static final Set<String> REQUIRED_SCOPES = Set.of(API_ADMIN, READONLY_QUERY, OTLP_INGEST, UI_SESSION);

    private AuthTokenScopes() {
    }

    public static String normalizeApiTokenScope(String tokenScope) {
        String normalized = normalizeScopeValue(tokenScope, API_ADMIN);
        if (!API_TOKEN_SCOPES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported API token scope: " + tokenScope);
        }
        return normalized;
    }

    public static String normalizeRequiredScope(String requiredScope) {
        String normalized = normalizeScopeValue(requiredScope, API_ADMIN);
        if (!REQUIRED_SCOPES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported required token scope: " + requiredScope);
        }
        return normalized;
    }

    public static Set<String> allowedTokenScopesFor(String requiredScope) {
        return switch (normalizeRequiredScope(requiredScope)) {
            case API_ADMIN -> Set.of(API_ADMIN);
            case READONLY_QUERY -> Set.of(API_ADMIN, READONLY_QUERY);
            case OTLP_INGEST -> Set.of(API_ADMIN, OTLP_INGEST);
            case UI_SESSION -> Set.of(UI_SESSION);
            default -> Set.of();
        };
    }

    public static String normalizeWorkspaceId(String workspaceId) {
        String normalized = StringUtils.trimToNull(workspaceId);
        return normalized == null ? DEFAULT_WORKSPACE_ID : normalized;
    }

    private static String normalizeScopeValue(String scope, String defaultScope) {
        if (StringUtils.isBlank(scope)) {
            return defaultScope;
        }
        return scope.trim().toLowerCase(Locale.ROOT);
    }
}
