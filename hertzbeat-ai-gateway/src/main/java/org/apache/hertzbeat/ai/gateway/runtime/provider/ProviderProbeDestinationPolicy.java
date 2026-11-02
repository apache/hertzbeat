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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Validates administrator-supplied HTTP(S) URLs without resolving or restricting their destination addresses. */
@Component
public class ProviderProbeDestinationPolicy {
    public Destination resolve(String baseUrl, String protocol) {
        URI base = parse(baseUrl);
        // Match the runtime SDK: append resource segments to the supplied base prefix.
        String prefix = base.toString();
        if (!prefix.endsWith("/")) prefix += "/";
        String suffix = "responses".equals(protocol) ? "responses" : "chat/completions";
        return new Destination(URI.create(prefix + suffix));
    }

    public static String origin(URI uri) {
        int port = uri.getPort() < 0 ? ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80) : uri.getPort();
        return uri.getScheme().toLowerCase(Locale.ROOT) + "://" + uri.getHost().toLowerCase(Locale.ROOT) + ":" + port;
    }

    public static URI parse(String value) {
        try {
            String text = value == null ? "" : value.trim();
            URI uri = URI.create(text);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!Set.of("https", "http").contains(scheme) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || uri.getPort() == 0 || uri.getPort() > 65535 || text.length() > 2048) {
                throw new DestinationDenied();
            }
            return URI.create(scheme + text.substring(text.indexOf(':')));
        } catch (IllegalArgumentException failure) {
            throw new DestinationDenied();
        }
    }

    /** A syntactically valid endpoint; DNS and proxy selection belong to the normal HTTP client. */
    public record Destination(URI endpoint) { }

    /** Invalid provider URL, independent of DNS resolution or address range. */
    public static final class DestinationDenied extends RuntimeException { }
}
