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

package org.apache.hertzbeat.manager.setup.config;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.URI;
import java.util.Locale;
import java.util.Optional;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;

/** A validated operator-advertised address; validation is purely syntactic and never resolves DNS. */
public record SetupPublicAddress(String value, Kind kind) {

    /** Address contracts differ between the browser-facing base URL and OTLP intake endpoints. */
    public enum Kind {
        PUBLIC_BASE_URL,
        SERVER_OTLP_ENDPOINT
    }

    public SetupPublicAddress {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Public address must not be blank");
        }
        value = value.trim();
        URI uri = URI.create(value);
        if (kind == null || uri.getHost() == null || uri.getHost().indexOf('%') >= 0
                || wildcardHost(uri.getHost()) || invalidPort(uri.getPort())) {
            throw new IllegalArgumentException("Public address is invalid");
        }
        if (kind == Kind.PUBLIC_BASE_URL) {
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
                throw new IllegalArgumentException("Public base URL is invalid");
            }
        } else {
            IntakeEndpoint.fromUrl(value);
        }
    }

    public static Optional<SetupPublicAddress> publicBaseUrl(String value) {
        return parse(value, Kind.PUBLIC_BASE_URL);
    }

    public static Optional<SetupPublicAddress> serverOtlpEndpoint(String value) {
        return parse(value, Kind.SERVER_OTLP_ENDPOINT);
    }

    public static Optional<SetupPublicAddress> tryPublicBaseUrl(String value) {
        return tryParse(value, Kind.PUBLIC_BASE_URL);
    }

    public static Optional<SetupPublicAddress> tryServerOtlpEndpoint(String value) {
        return tryParse(value, Kind.SERVER_OTLP_ENDPOINT);
    }

    public boolean plaintextPublic() {
        URI uri = URI.create(value);
        return "http".equalsIgnoreCase(uri.getScheme()) && !internalHost(uri.getHost());
    }

    private static Optional<SetupPublicAddress> parse(String value, Kind kind) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new SetupPublicAddress(value, kind));
    }

    private static Optional<SetupPublicAddress> tryParse(String value, Kind kind) {
        try {
            return parse(value, kind);
        } catch (IllegalArgumentException failure) {
            return Optional.empty();
        }
    }

    private static boolean invalidPort(int port) {
        return port == 0 || port > 65_535;
    }

    private static boolean wildcardHost(String value) {
        String host = withoutIpv6Brackets(value.toLowerCase(Locale.ROOT));
        InetAddress address = literalAddress(host);
        return address != null && address.isAnyLocalAddress();
    }

    private static boolean internalHost(String value) {
        String host = withoutIpv6Brackets(value.toLowerCase(Locale.ROOT));
        InetAddress address = literalAddress(host);
        if (address instanceof Inet4Address) {
            return privateIpv4(address.getHostAddress());
        }
        if (address != null) {
            return address.isLoopbackAddress() || address.isLinkLocalAddress()
                    || privateIpv6(address.getHostAddress());
        }
        return host.equals("localhost") || host.endsWith(".localhost") || host.endsWith(".local")
                || host.endsWith(".internal") || (!host.contains(".") && !host.contains(":"))
                || privateIpv4(host);
    }

    private static String withoutIpv6Brackets(String host) {
        return host.length() > 1 && host.charAt(0) == '[' && host.charAt(host.length() - 1) == ']'
                ? host.substring(1, host.length() - 1) : host;
    }

    private static boolean privateIpv4(String host) {
        String[] parts = host.split("\\.", -1);
        if (parts.length != 4) {
            return false;
        }
        try {
            int first = octet(parts[0]);
            int second = octet(parts[1]);
            octet(parts[2]);
            octet(parts[3]);
            return first == 10 || first == 127 || first == 0 || (first == 169 && second == 254)
                    || (first == 172 && second >= 16 && second <= 31) || (first == 192 && second == 168);
        } catch (IllegalArgumentException failure) {
            return false;
        }
    }

    private static InetAddress literalAddress(String host) {
        try {
            return InetAddress.ofLiteral(host);
        } catch (IllegalArgumentException failure) {
            return null;
        }
    }

    private static int octet(String value) {
        int parsed = Integer.parseInt(value);
        if (parsed < 0 || parsed > 255) {
            throw new IllegalArgumentException("Invalid IPv4 octet");
        }
        return parsed;
    }

    private static boolean privateIpv6(String host) {
        return host.equals("::1") || host.equals("0:0:0:0:0:0:0:1") || host.startsWith("fc")
                || host.startsWith("fd") || host.matches("fe[89ab].*");
    }
}
