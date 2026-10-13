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

package org.apache.hertzbeat.manager.setup.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

/** Conservative direct-socket policy; forwarding headers are untrusted without an explicit trust boundary. */
public final class SetupRequestSecurityPolicy {
    private static final List<String> FORWARDING_HEADERS = List.of(
            "Forwarded", "X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host");

    public boolean hasUntrustedForwarding(HttpServletRequest request) {
        return FORWARDING_HEADERS.stream().anyMatch(name -> request.getHeader(name) != null);
    }

    public boolean secureCookie(HttpServletRequest request) {
        return inspect(request).secureCookie();
    }

    public RequestContext inspect(HttpServletRequest request) {
        RequestPath path = hasUntrustedForwarding(request)
                ? RequestPath.UNTRUSTED_FORWARDED : RequestPath.DIRECT;
        TransportSecurity transport = request.isSecure()
                ? TransportSecurity.SECURE : TransportSecurity.CLEAR;
        return new RequestContext(request.getRemoteAddr(), path, transport);
    }

    /** Security-relevant request facts derived without trusting proxy-provided values. */
    public record RequestContext(String remoteAddress, RequestPath path, TransportSecurity transport) {
        boolean requiresProofOnLoopback() {
            return path == RequestPath.UNTRUSTED_FORWARDED;
        }

        boolean secureCookie() {
            return path == RequestPath.DIRECT && transport == TransportSecurity.SECURE;
        }
    }

    /** Whether the socket request arrived directly or carries untrusted forwarding metadata. */
    public enum RequestPath {
        DIRECT,
        UNTRUSTED_FORWARDED
    }

    /** Security of the direct servlet transport, independent of forwarding metadata. */
    public enum TransportSecurity {
        CLEAR,
        SECURE
    }
}
