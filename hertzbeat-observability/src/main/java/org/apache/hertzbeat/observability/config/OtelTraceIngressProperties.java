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

package org.apache.hertzbeat.observability.config;

import java.net.URI;
import java.util.Locale;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Optional authenticated loopback destination for HertzBeat's own traces. */
@ConfigurationProperties(prefix = "hertzbeat.observability.otel.trace-ingress")
public final class OtelTraceIngressProperties implements InitializingBean {

    private static final String TRACE_INGRESS_PATH = "/api/otlp/v1/traces";

    private boolean enabled;
    private URI endpoint;
    private String token = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public URI getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(URI endpoint) {
        this.endpoint = endpoint;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    @Override
    public void afterPropertiesSet() {
        validate();
    }

    void validate() {
        if (!enabled) {
            return;
        }
        if (!isSafeEndpoint(endpoint)) {
            throw new IllegalStateException("Trace ingress endpoint must be a loopback OTLP HTTP trace endpoint");
        }
        if (StringUtils.isBlank(token)) {
            throw new IllegalStateException("Trace ingress token is required");
        }
    }

    URI validatedEndpoint() {
        validate();
        return endpoint;
    }

    String authorizationHeader() {
        validate();
        return "Bearer " + token.trim();
    }

    private boolean isSafeEndpoint(URI candidate) {
        if (candidate == null || candidate.getScheme() == null || candidate.getHost() == null) {
            return false;
        }
        String scheme = candidate.getScheme().toLowerCase(Locale.ROOT);
        if (!("http".equals(scheme) || "https".equals(scheme)) || !isLoopbackHost(candidate.getHost())) {
            return false;
        }
        return candidate.getRawUserInfo() == null
                && candidate.getRawQuery() == null
                && candidate.getRawFragment() == null
                && TRACE_INGRESS_PATH.equals(candidate.getRawPath());
    }

    private boolean isLoopbackHost(String host) {
        return "localhost".equalsIgnoreCase(host)
                || "127.0.0.1".equals(host)
                || "::1".equals(host)
                || "[::1]".equals(host);
    }
}
