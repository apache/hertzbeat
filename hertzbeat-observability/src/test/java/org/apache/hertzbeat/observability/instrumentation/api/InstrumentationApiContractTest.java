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

package org.apache.hertzbeat.observability.instrumentation.api;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CollectorTarget;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideSnippet;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideStep;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretPlaceholder;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretReplacement;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SecretValueFormat;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.StepType;
import org.junit.jupiter.api.Test;

class InstrumentationApiContractTest {

    private static final String SECRET_NAME = "authorizationToken";
    private static final String SECRET_MARKER = "${HERTZBEAT_TOKEN}";

    @Test
    void rejectsSnippetReferenceToUnknownSecretPlaceholder() {
        assertThrows(IllegalArgumentException.class, () -> response(
                Map.of(SECRET_NAME, placeholder(SECRET_MARKER)),
                snippet("export TOKEN=" + SECRET_MARKER, "missingPlaceholder")));
    }

    @Test
    void rejectsUndeclaredSecretMarkerInSnippetContent() {
        assertThrows(IllegalArgumentException.class, () -> response(
                Map.of(SECRET_NAME, placeholder(SECRET_MARKER)),
                snippet("export TOKEN=" + SECRET_MARKER)));
    }

    @Test
    void rejectsSecretReferenceWhenSnippetDoesNotContainMarker() {
        assertThrows(IllegalArgumentException.class, () -> response(
                Map.of(SECRET_NAME, placeholder(SECRET_MARKER)),
                snippet("start application", SECRET_NAME)));
    }

    @Test
    void rejectsUnusedOrDuplicateSecretMarkers() {
        assertThrows(IllegalArgumentException.class, () -> response(
                Map.of(SECRET_NAME, placeholder(SECRET_MARKER)),
                snippet("start application")));
        assertThrows(IllegalArgumentException.class, () -> response(
                Map.of(
                        SECRET_NAME, placeholder(SECRET_MARKER),
                        "secondaryToken", placeholder(SECRET_MARKER)),
                snippet("export TOKEN=" + SECRET_MARKER, SECRET_NAME),
                snippet("export SECONDARY_TOKEN=" + SECRET_MARKER, "secondaryToken")));
    }

    @Test
    void acceptsOnlyBidirectionallyDeclaredSecretMarkers() {
        assertDoesNotThrow(() -> response(
                Map.of(SECRET_NAME, placeholder(SECRET_MARKER)),
                snippet("export TOKEN=" + SECRET_MARKER, SECRET_NAME)));
    }

    @Test
    void onboardingRequestsExposeNoSecretValueComponents() {
        assertNoSecretValueComponents(GuideRenderRequest.class);
        assertNoSecretValueComponents(DetectionRequest.class);
        assertNoSecretValueComponents(CollectorTarget.class);
    }

    private GuideRenderResponse response(Map<String, SecretPlaceholder> placeholders, GuideSnippet... snippets) {
        return new GuideRenderResponse(
                1,
                null,
                null,
                null,
                placeholders,
                List.of(new GuideStep(
                        "configure",
                        StepType.CONFIGURE,
                        "instrumentation.step.configure",
                        "instrumentation.location.application_environment",
                        List.of(snippets))));
    }

    private SecretPlaceholder placeholder(String marker) {
        return new SecretPlaceholder(marker, SecretValueFormat.URL_UNRESERVED, SecretReplacement.RAW);
    }

    private GuideSnippet snippet(String content, String... placeholders) {
        return new GuideSnippet("command", "bash", content, List.of(placeholders));
    }

    private void assertNoSecretValueComponents(Class<? extends Record> contract) {
        for (var component : contract.getRecordComponents()) {
            String name = component.getName().toLowerCase(Locale.ROOT);
            assertFalse(name.contains("token"), component.getName());
            assertFalse(name.contains("secret"), component.getName());
        }
    }
}
