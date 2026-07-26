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

package org.apache.hertzbeat.ai.gateway.identity;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.util.JsonUtil;

/**
 * Shared actor normalization and projection helpers for Agent Gateway.
 */
public final class ActorSupport {

    public static final String TYPE_USER = "user";

    public static final String TYPE_SYSTEM = "system";

    public static final String ID_ALERT_ANALYSIS = "alert-analysis";

    public static final String ROLE_ADMIN = "admin";

    public static final String ROLE_USER = "user";

    public static final String ROLE_GUEST = "guest";

    public static final String ROLE_ALERT_ANALYSIS = "alert-analysis";

    private static final String ROLES_CLAIM = "roles";

    private static final List<String> WELL_KNOWN_ROLES = List.of(ROLE_ADMIN, ROLE_USER, ROLE_GUEST);

    private ActorSupport() {
    }

    /**
     * Build a trusted user actor from the current Sureness context.
     */
    public static AgentActor requireCurrentSurenessActor() {
        return requireSurenessActor(SurenessContextHolder.getBindSubject());
    }

    /**
     * Build a trusted user actor from a Sureness subject and validate principal and roles.
     */
    public static AgentActor requireSurenessActor(SubjectSum subject) {
        if (subject == null) {
            throw new IllegalStateException("Authenticated subject is required");
        }
        String principal = normalizeSubjectPrincipal(subject);
        List<String> roles = extractSurenessRoles(subject);
        if (roles.isEmpty()) {
            throw new IllegalStateException("Authenticated subject roles are required");
        }
        return AgentActor.builder()
            .type(TYPE_USER)
            .id(principal)
            .roles(roles)
            .build();
    }

    /**
     * Extract Sureness roles from subject roles, JWT role claims, and hasRole checks.
     */
    public static List<String> extractSurenessRoles(SubjectSum subject) {
        if (subject == null) {
            return List.of();
        }
        List<String> roles = new ArrayList<>();
        addRoles(roles, subject.getRoles());
        PrincipalMap principalMap = subject.getPrincipalMap();
        if (principalMap != null) {
            addRoles(roles, principalMap.getPrincipal(ROLES_CLAIM));
        }
        WELL_KNOWN_ROLES.forEach(role -> addRoleIfPresent(subject, roles, role));
        return List.copyOf(roles);
    }

    /**
     * Whether the actor carries both type and id.
     */
    public static boolean hasIdentity(AgentActor actor) {
        return actor != null && StringUtils.isNoneBlank(actor.getType(), actor.getId());
    }

    /**
     * Serialize actor roles as JSON for fields that already store JSON role arrays.
     */
    public static String rolesJson(AgentActor actor) {
        return actor == null ? null : JsonUtil.toJson(actor.getRoles());
    }

    private static String normalizeSubjectPrincipal(SubjectSum subject) {
        Object principal = subject.getPrincipal();
        // Security subjects may expose padded textual principals; canonicalize before using them as actor identity.
        String normalized = GatewayText.normalize(principal == null ? null : String.valueOf(principal));
        if (normalized == null) {
            throw new IllegalStateException("Authenticated subject principal is required");
        }
        return normalized;
    }

    private static void addRoles(List<String> roles, Object rawRoles) {
        if (rawRoles instanceof Collection<?> values) {
            values.forEach(value -> addRole(roles, value));
            return;
        }
        if (rawRoles instanceof String value) {
            for (String role : value.split(",")) {
                addRole(roles, role);
            }
        }
    }

    private static void addRoleIfPresent(SubjectSum subject, List<String> roles, String role) {
        if (subject.hasRole(role)) {
            addRole(roles, role);
        }
    }

    private static void addRole(List<String> roles, Object rawRole) {
        // Security frameworks may expose padded or comma-split role values; canonicalize before role comparison.
        String role = GatewayText.normalize(rawRole == null ? null : String.valueOf(rawRole));
        if (role != null && !roles.contains(role)) {
            roles.add(role);
        }
    }
}
