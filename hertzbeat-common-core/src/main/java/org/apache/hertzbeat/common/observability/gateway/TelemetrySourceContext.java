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

import java.util.concurrent.Callable;

/** Authorized immutable routing captured explicitly before asynchronous work. */
public final class TelemetrySourceContext {
    private static final ThreadLocal<Route> CURRENT = new ThreadLocal<>();

    private TelemetrySourceContext() { }

    /** Captured server-authorized destination; database never comes from a request. */

    public record Route(TelemetrySource source, String database, String workspaceId) {
        public Route {
            if (source == null || (source == TelemetrySource.SELF
                    && (database == null || !database.matches("[A-Za-z_][A-Za-z0-9_]*")
                    || workspaceId == null || workspaceId.isBlank()))) {
                throw new IllegalArgumentException("Invalid trusted telemetry route");
            }
        }
    }

    public static Route capture() {
        return CURRENT.get();
    }

    public static boolean isSelf() {
        return CURRENT.get() != null && CURRENT.get().source() == TelemetrySource.SELF;
    }

    public static String database(String externalDatabase) {
        return isSelf() ? CURRENT.get().database() : externalDatabase;
    }

    public static void bind(Route route) {
        if (route == null) {
            CURRENT.remove();
        } else {
            CURRENT.set(route);
        }
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static <T> T call(Route route, Callable<T> operation) throws Exception {
        Route previous = capture();
        bind(route);
        try {
            return operation.call();
        } finally {
            bind(previous);
        }
    }
}
