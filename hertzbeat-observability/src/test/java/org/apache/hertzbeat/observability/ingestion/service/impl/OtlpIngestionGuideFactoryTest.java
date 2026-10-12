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

package org.apache.hertzbeat.observability.ingestion.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class OtlpIngestionGuideFactoryTest {

    private final OtlpIngestionGuideFactory factory = new OtlpIngestionGuideFactory(false, 1157, 4317);

    @Test
    void buildsHttpAndGrpcEndpointsFromForwardedHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerPort(443);
        request.addHeader("X-Forwarded-Host", "demo.hertzbeat.apache.org");
        request.addHeader("X-Forwarded-Proto", "https");

        OtlpIngestionGuideDto guide = factory.create(request);

        assertEquals("demo.hertzbeat.apache.org:4317", guide.getGrpcAuthorityExample());
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "metrics".equals(signal.getSignal())
                && "https://demo.hertzbeat.apache.org/api/otlp/v1/metrics".equals(signal.getEndpoint())));
    }

    @Test
    void preservesBracketedIpv6AndExplicitForwardedPort() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Forwarded", "proto=https;host=\"[2001:db8::1]:8443\"");

        OtlpIngestionGuideDto guide = factory.create(request);

        assertEquals("[2001:db8::1]:4317", guide.getGrpcAuthorityExample());
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "logs".equals(signal.getSignal())
                && "https://[2001:db8::1]:8443/api/otlp/v1/logs".equals(signal.getEndpoint())));
    }

    @Test
    void usesConfiguredFallbackEndpointsWhenRequestHostIsMissing() {
        OtlpIngestionGuideFactory secureFactory = new OtlpIngestionGuideFactory(true, 8443, 55680);

        OtlpIngestionGuideDto guide = secureFactory.create(null);

        assertEquals("<your-hertzbeat-host>:55680", guide.getGrpcAuthorityExample());
        assertTrue(guide.getSignals().stream().anyMatch(signal -> "traces".equals(signal.getSignal())
                && "https://<your-hertzbeat-host>/api/otlp/v1/traces".equals(signal.getEndpoint())));
    }
}
