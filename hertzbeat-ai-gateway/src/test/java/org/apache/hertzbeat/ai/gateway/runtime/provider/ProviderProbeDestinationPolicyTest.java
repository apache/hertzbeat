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

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProviderProbeDestinationPolicyTest {
    @ParameterizedTest
    @ValueSource(strings = {"http://127.0.0.1:11434/v1", "https://127.0.0.1/v1", "http://10.0.0.1/v1",
        "https://198.18.0.188/v1", "http://169.254.169.254/v1", "http://[::1]:11434/v1", "https://[fd00::1]/v1",
        "https://100.64.0.1/v1", "https://[2002:7f00:1::]/v1", "https://[2001:db8::1]/v1", "http://unresolved.fixture.invalid/v1"})
    void administratorHttpTargetsDoNotRequireAnAddressAllowanceOrPreResolution(String url) {
        assertEquals(url + "/responses", new ProviderProbeDestinationPolicy().resolve(url, "responses").endpoint().toString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "fixture.invalid/v1", "file:///tmp/fixture", "ftp://fixture.invalid/v1",
        "https://user:pass@fixture.invalid/v1", "https://fixture.invalid/v1?key=fixture", "https://fixture.invalid/v1#fragment",
        "https://127.0.0.1:0/v1", "https://fixture.invalid:65536/v1"})
    void malformedOrNonHttpUrlsRemainRejected(String url) {
        assertThrows(ProviderProbeDestinationPolicy.DestinationDenied.class, () -> ProviderProbeDestinationPolicy.parse(url));
    }

    @Test
    void missingUrlAndUnboundedUrlRemainRejected() {
        assertThrows(ProviderProbeDestinationPolicy.DestinationDenied.class, () -> ProviderProbeDestinationPolicy.parse(null));
        assertThrows(ProviderProbeDestinationPolicy.DestinationDenied.class,
                () -> ProviderProbeDestinationPolicy.parse("https://fixture.invalid/" + "x".repeat(2048)));
    }

    @Test
    void canonicalOriginStillBindsTheCredentialToSchemeHostAndPort() {
        assertEquals("https://fixture.invalid:443", ProviderProbeDestinationPolicy.origin(
                ProviderProbeDestinationPolicy.parse(" HTTPS://FIXTURE.INVALID/v1 ")));
        assertEquals("http://fixture.invalid:11434", ProviderProbeDestinationPolicy.origin(
                ProviderProbeDestinationPolicy.parse("http://fixture.invalid:11434/v1")));
    }
}
