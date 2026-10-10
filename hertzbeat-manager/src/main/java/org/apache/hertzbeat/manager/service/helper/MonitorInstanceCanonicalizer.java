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

package org.apache.hertzbeat.manager.service.helper;

import java.net.URI;
import java.net.URISyntaxException;
import org.springframework.util.StringUtils;

/** Produces the server-owned identity used by scheduling, persistence and telemetry metadata. */
public final class MonitorInstanceCanonicalizer {

    public static final String SERVICE_DISCOVERY_INSTANCE = "unknow";

    private MonitorInstanceCanonicalizer() {
    }

    public static String canonicalize(boolean isStatic, String host, String port) {
        if (!isStatic) {
            return SERVICE_DISCOVERY_INSTANCE;
        }
        if (!StringUtils.hasText(host)) {
            throw new IllegalArgumentException("Static monitor host is required");
        }
        String normalizedHost = host.trim();
        String normalizedPort = StringUtils.hasText(port) ? port.trim() : null;
        if (normalizedPort == null) {
            return normalizedHost;
        }
        if (normalizedHost.contains("://")) {
            return addUriPort(normalizedHost, normalizedPort);
        }
        if (normalizedHost.startsWith("[")) {
            int closingBracket = normalizedHost.indexOf(']');
            if (closingBracket > 0 && closingBracket == normalizedHost.length() - 1) {
                return normalizedHost + ':' + normalizedPort;
            }
            return normalizedHost;
        }
        long colonCount = normalizedHost.chars().filter(character -> character == ':').count();
        if (colonCount > 1) {
            return '[' + normalizedHost + "]:" + normalizedPort;
        }
        if (colonCount == 1 && hasNumericPort(normalizedHost)) {
            return normalizedHost;
        }
        return normalizedHost + ':' + normalizedPort;
    }

    private static String addUriPort(String host, String port) {
        try {
            URI uri = new URI(host);
            if (uri.getPort() >= 0) {
                return host;
            }
            return new URI(uri.getScheme(), uri.getUserInfo(), uri.getHost(), Integer.parseInt(port),
                    uri.getPath(), uri.getQuery(), uri.getFragment()).toString();
        } catch (URISyntaxException | NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid monitor host or port", exception);
        }
    }

    private static boolean hasNumericPort(String host) {
        int separator = host.lastIndexOf(':');
        return separator > 0 && separator < host.length() - 1
                && host.substring(separator + 1).chars().allMatch(Character::isDigit);
    }
}
