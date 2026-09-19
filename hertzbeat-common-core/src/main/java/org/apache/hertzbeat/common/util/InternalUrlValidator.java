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

package org.apache.hertzbeat.common.util;

import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import lombok.extern.slf4j.Slf4j;

/**
 * Validates user-configured outbound URLs to prevent SSRF to internal networks.
 * <p>
 * Checks performed:
 * <ul>
 *   <li>Scheme must be {@code http} or {@code https}</li>
 *   <li>Resolved host must not be loopback / link-local / site-local / ULA / reserved</li>
 *   <li>All resolved IPs are checked (DNS can return multiple addresses)</li>
 * </ul>
 * Used by webhook/notification handlers that issue server-side requests to
 * user-supplied URLs.
 */
@Slf4j
public final class InternalUrlValidator {

    private InternalUrlValidator() {
    }

    /**
     * Validate that the given URL does not target an internal or reserved network address.
     *
     * @param url the URL string to validate
     * @throws IllegalArgumentException if the URL is malformed or targets an internal address
     */
    public static void validate(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL must not be null or blank");
        }
        URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Invalid URL: " + e.getMessage(), e);
        }
        validate(uri);
    }

    /**
     * Validate that the given URI does not target an internal or reserved network address.
     *
     * @param uri the URI to validate
     * @throws IllegalArgumentException if the URI is malformed or targets an internal address
     */
    public static void validate(URI uri) {
        if (uri == null) {
            throw new IllegalArgumentException("URI must not be null");
        }

        // 1. Scheme check
        String scheme = uri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new IllegalArgumentException("URL scheme must be http or https, got: " + scheme);
        }

        // 2. Host check
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL host must not be null or empty");
        }

        // 3. Resolve and check all IPs
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (isInternalOrReserved(address)) {
                    log.warn("Blocked outbound request to internal/reserved address: {} ({})",
                            host, address.getHostAddress());
                    throw new IllegalArgumentException(
                            "URL resolves to an internal or reserved address: " + address.getHostAddress());
                }
            }
        } catch (UnknownHostException e) {
            // Fail closed: if we can't resolve, we can't verify safety
            throw new IllegalArgumentException("Unable to resolve host: " + host, e);
        }
    }

    /**
     * Check whether an InetAddress is an internal, loopback, link-local, site-local,
     * ULA, or reserved address that should not be contacted by user-configured webhooks.
     */
    private static boolean isInternalOrReserved(InetAddress address) {
        // Built-in checks cover loopback, link-local, site-local, any-local, multicast
        if (address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isAnyLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }

        byte[] addr = address.getAddress();

        // IPv4 additional checks
        if (addr.length == 4) {
            int first = addr[0] & 0xFF;
            // 240.0.0.0/4 reserved (includes 255.255.255.255 broadcast)
            if (first >= 240) {
                return true;
            }
            // 100.64.0.0/10 Carrier-Grade NAT (shared address space)
            if (first == 100) {
                int second = addr[1] & 0xFF;
                if (second >= 64 && second <= 127) {
                    return true;
                }
            }
            // 192.0.0.0/24 IETF Protocol Assignments
            if (first == 192 && (addr[1] & 0xFF) == 0 && (addr[2] & 0xFF) == 0) {
                return true;
            }
            // 192.0.2.0/24 TEST-NET-1 (documentation)
            if (first == 192 && (addr[1] & 0xFF) == 0 && (addr[2] & 0xFF) == 2) {
                return true;
            }
            // 198.51.100.0/24 TEST-NET-2 (documentation)
            if (first == 198 && (addr[1] & 0xFF) == 51 && (addr[2] & 0xFF) == 100) {
                return true;
            }
            // 203.0.113.0/24 TEST-NET-3 (documentation)
            if (first == 203 && (addr[1] & 0xFF) == 0 && (addr[2] & 0xFF) == 113) {
                return true;
            }
        }

        // IPv6 additional checks
        if (addr.length == 16) {
            int first = addr[0] & 0xFF;
            // fc00::/7 Unique Local Address (ULA) — isSiteLocalAddress does NOT cover this
            if ((first & 0xFE) == 0xFC) {
                return true;
            }
            // 2001:db8::/32 documentation prefix
            if (first == 0x20 && (addr[1] & 0xFF) == 0x01
                    && (addr[2] & 0xFF) == 0x0D && (addr[3] & 0xFF) == 0xB8) {
                return true;
            }
        }

        return false;
    }
}
