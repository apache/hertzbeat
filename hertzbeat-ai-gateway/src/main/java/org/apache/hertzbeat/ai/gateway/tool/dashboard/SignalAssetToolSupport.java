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

package org.apache.hertzbeat.ai.gateway.tool.dashboard;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;

/** Trusted identity and bounded response helpers for shared assets and private drafts. */
public final class SignalAssetToolSupport {

    private SignalAssetToolSupport() {
    }

    public static String actor(boolean write) {
        AgentActor actor = AgentToolContextSupport.invocation().getRequest().getActor();
        if (!ActorSupport.TYPE_USER.equals(actor.getType()) || actor.getId() == null || actor.getId().isBlank()
                || actor.getRoles() == null || actor.getRoles().stream().noneMatch(role -> role != null && !role.isBlank())) {
            throw new IllegalArgumentException("Authenticated user identity and roles are required");
        }
        if (write && !actor.getRoles().contains(ActorSupport.ROLE_ADMIN)
                && !actor.getRoles().contains(ActorSupport.ROLE_USER)) {
            throw new IllegalArgumentException("Admin or user role is required to edit signal assets");
        }
        return actor.getId();
    }

    public static String key(String value) {
        if (value == null || !value.matches("[A-Za-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Invalid signal asset key");
        }
        return value;
    }

    public static String signal(String value, boolean draft) {
        if (value == null || !(draft ? Set.of("logs", "traces", "metrics", "alerts")
                : Set.of("logs", "traces", "metrics")).contains(value)) {
            throw new IllegalArgumentException("Unsupported signal");
        }
        return value;
    }

    public static void revision(Long revision, boolean required) {
        if (required && revision == null || revision != null && revision < 0) {
            throw new IllegalArgumentException("A nonnegative current revision is required; omit only for creation");
        }
    }

    public static void reason(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 512) {
            throw new IllegalArgumentException("A deletion reason of 1 to 512 characters is required");
        }
    }

    public static int offset(Integer offset) {
        int result = offset == null ? 0 : offset;
        if (result < 0 || result > 10000) {
            throw new IllegalArgumentException("offset must be between 0 and 10000");
        }
        return result;
    }

    public static int limit(Integer limit) {
        int result = limit == null ? 5 : limit;
        if (result < 1 || result > 10) {
            throw new IllegalArgumentException("limit must be between 1 and 10");
        }
        return result;
    }

    public static Map<String, Object> page(List<?> items, int offset, int limit, String scope) {
        List<?> safe = items == null ? List.of() : items;
        int from = Math.min(offset, safe.size());
        int to = Math.min(from + limit, safe.size());
        return Map.of("items", safe.subList(from, to), "offset", offset, "limit", limit,
                "hasMore", to < safe.size(), "scope", scope);
    }
}
