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

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProviderProbeUrlRegressionTest {
    @Test
    void validHttpsSchemeIsCaseInsensitiveAndWhitespaceIsNormalized() {
        assertEquals("https", ProviderProbeDestinationPolicy.parse("  HTTPS://fixture.invalid/v1/  ").getScheme());
    }

    @Test
    void missingSchemesAreConfigurationErrorsRatherThanNullPointerFailures() {
        assertThrows(ProviderProbeDestinationPolicy.DestinationDenied.class, () -> ProviderProbeDestinationPolicy.parse(null));
        assertThrows(ProviderProbeDestinationPolicy.DestinationDenied.class, () -> ProviderProbeDestinationPolicy.parse("fixture.invalid/v1"));
    }

    @Test
    void endpointPrefixMatchesTheActualRuntimeSdkForBothSchemesAndProtocols() {
        var policy = new ProviderProbeDestinationPolicy();
        for (String base : List.of("https://fixture.invalid/v1", "https://fixture.invalid/v1/", "https://fixture.invalid/v1///",
                "http://127.0.0.1:11434/v1", "http://unresolved.fixture.invalid/v1")) {
            for (String protocol : List.of("responses", "chat-completions")) {
                var segments = "responses".equals(protocol) ? List.of("responses") : List.of("chat", "completions");
                String runtime = com.openai.core.http.HttpRequest.builder().method(com.openai.core.http.HttpMethod.POST)
                        .baseUrl(base).pathSegments(segments).build().url();
                assertEquals(runtime, policy.resolve(base, protocol).endpoint().toString());
            }
        }
    }
}
