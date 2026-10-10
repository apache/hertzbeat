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

package org.apache.hertzbeat.collector.runtime.otel;

import java.net.URI;
import java.util.Locale;

/**
 * Validates and canonicalizes the shared OTLP/HTTP export base endpoint.
 */
final class OtelRuntimeExportEndpointPolicy {

    private OtelRuntimeExportEndpointPolicy() {
    }

    static String canonicalize(URI endpoint) {
        if (endpoint == null || endpoint.isOpaque() || endpoint.getHost() == null
                || endpoint.getRawUserInfo() != null || endpoint.getPort() > 65535) {
            throw new IllegalArgumentException("OTLP HTTP export endpoint must be an HTTP(S) server URI");
        }
        String scheme = endpoint.getScheme() == null ? "" : endpoint.getScheme().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            throw new IllegalArgumentException("OTLP HTTP export endpoint must use HTTP or HTTPS");
        }
        if (endpoint.getRawQuery() != null || endpoint.getRawFragment() != null) {
            throw new IllegalArgumentException("OTLP HTTP export endpoint must not contain a query or fragment");
        }
        String path = endpoint.getRawPath() == null ? "" : endpoint.getRawPath();
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return scheme + "://" + endpoint.getRawAuthority() + path;
    }
}
