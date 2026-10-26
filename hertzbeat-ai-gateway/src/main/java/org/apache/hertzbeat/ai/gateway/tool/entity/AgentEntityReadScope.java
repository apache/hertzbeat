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

package org.apache.hertzbeat.ai.gateway.tool.entity;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Canonical filters shared by the explicit model callback and its read-evidence verifier. */
public final class AgentEntityReadScope {
    private AgentEntityReadScope() {}

    public static String filter(Object value) {
        if (value == null) return null;
        if (!(value instanceof String text) || text.length() > 128)
            throw new IllegalArgumentException("Invalid entity read filter");
        return text.isBlank() ? null : text.trim();
    }

    public static String alertStatus(Object value) {
        String text = filter(value);
        if (text == null) return "firing";
        text = text.toLowerCase(Locale.ROOT);
        if (!Set.of("firing", "resolved", "acknowledged").contains(text))
            throw new IllegalArgumentException("Unknown alert status");
        return text;
    }

    public static String severity(Object value) {
        String text = filter(value);
        if (text == null || text.equalsIgnoreCase("all")) return null;
        return switch (text.toLowerCase(Locale.ROOT)) {
            case "warn" -> "warning";
            case "err" -> "error";
            default -> text.toLowerCase(Locale.ROOT);
        };
    }

    public static Map<String, Object> scope(String tool, Map<String, Object> args) {
        long id = number(args.get("entityId"));
        if (id <= 0) throw new IllegalArgumentException("Invalid entity ID");
        long page = args.get("pageIndex") == null ? 0 : number(args.get("pageIndex"));
        long size = args.get("pageSize") == null ? 10 : number(args.get("pageSize"));
        if (page < 0 || page > 10000 || size < 1 || size > 50)
            throw new IllegalArgumentException("Invalid page");
        if (tool.equals("entity.alerts"))
            return AgentToolContextSupport.arguments(
                    "entityId",
                    id,
                    "pageIndex",
                    page,
                    "pageSize",
                    size,
                    "status",
                    alertStatus(args.get("status")),
                    "severity",
                    severity(args.get("severity")));
        Object status = args.get("status");
        Long state = status == null ? null : number(status);
        if (state != null && (state < 0 || state > 4))
            throw new IllegalArgumentException("Invalid status");
        String app = filter(args.get("app"));
        return AgentToolContextSupport.arguments(
                "entityId",
                id,
                "pageIndex",
                page,
                "pageSize",
                size,
                "status",
                state,
                "app",
                app == null ? null : app.toLowerCase(Locale.ROOT));
    }

    private static long number(Object value) {
        return new BigDecimal(String.valueOf(value)).longValueExact();
    }
}
