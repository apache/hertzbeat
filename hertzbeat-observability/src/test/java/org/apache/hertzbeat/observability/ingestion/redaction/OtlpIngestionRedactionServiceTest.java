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

package org.apache.hertzbeat.observability.ingestion.redaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OtlpIngestionRedactionServiceTest {

    private final OtlpIngestionRedactionService redactionService = new OtlpIngestionRedactionService();

    @Test
    void redactsSensitiveKeysAndInlineSecretsWithoutDroppingSafeContext() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("service_name", "checkout");
        payload.put("http_request_header_authorization", "Bearer live-token");
        payload.put("db_password", "super-secret");
        payload.put("message", "login failed password=hunter2 token=abc123");
        payload.put("nested", Map.of("api_key", "key-123", "region", "us-east"));
        payload.put("events", List.of(Map.of("cookie", "session=raw", "status", "401")));

        Map<String, Object> redacted = redactionService.redactObjectMap(payload);

        assertEquals("checkout", redacted.get("service_name"));
        assertEquals("[REDACTED]", redacted.get("http_request_header_authorization"));
        assertEquals("[REDACTED]", redacted.get("db_password"));
        assertEquals("login failed password=[REDACTED] token=[REDACTED]", redacted.get("message"));
        assertEquals("[REDACTED]", ((Map<?, ?>) redacted.get("nested")).get("api_key"));
        assertEquals("us-east", ((Map<?, ?>) redacted.get("nested")).get("region"));
        assertEquals("[REDACTED]", ((Map<?, ?>) ((List<?>) redacted.get("events")).get(0)).get("cookie"));

        String rendered = redacted.toString();
        assertFalse(rendered.contains("live-token"));
        assertFalse(rendered.contains("super-secret"));
        assertFalse(rendered.contains("hunter2"));
        assertFalse(rendered.contains("abc123"));
        assertFalse(rendered.contains("session=raw"));
    }

    @Test
    void redactsBasicAuthorizationTokensInInlineAndStandaloneText() {
        String redacted = redactionService.redactText(
                "greptime rejected authorization=Basic ZGVtbzpzZWNyZXQ= and header Basic dGVzdDpzZWNyZXQ=");

        assertEquals("greptime rejected authorization=[REDACTED] and header Basic [REDACTED]", redacted);
        assertFalse(redacted.contains("ZGVtbzpzZWNyZXQ="));
        assertFalse(redacted.contains("dGVzdDpzZWNyZXQ="));
    }

    @Test
    void redactsDotSeparatedInlineSecretNamesBeforeGreptimeNativeStorage() {
        String redacted = redactionService.redactText(
                "log api.key=key-123 access.token=tok-456 client.secret=secret-789 "
                        + "private.key=pk-000 safe=value");

        assertEquals("log api.key=[REDACTED] access.token=[REDACTED] "
                + "client.secret=[REDACTED] private.key=[REDACTED] safe=value", redacted);
        assertFalse(redacted.contains("key-123"));
        assertFalse(redacted.contains("tok-456"));
        assertFalse(redacted.contains("secret-789"));
        assertFalse(redacted.contains("pk-000"));
    }

    @Test
    void redactsQuotedJsonStyleInlineSecretNamesBeforeGreptimeNativeStorage() {
        String redacted = redactionService.redactText(
                "{\"api.key\":\"key-123\",\"access.token\":\"tok-456\","
                        + "\"client.secret\":\"secret-789\",\"private.key\":\"pk-000\",\"safe\":\"value\"}");

        assertEquals("{\"api.key\":\"[REDACTED]\",\"access.token\":\"[REDACTED]\","
                + "\"client.secret\":\"[REDACTED]\",\"private.key\":\"[REDACTED]\",\"safe\":\"value\"}", redacted);
        assertFalse(redacted.contains("key-123"));
        assertFalse(redacted.contains("tok-456"));
        assertFalse(redacted.contains("secret-789"));
        assertFalse(redacted.contains("pk-000"));
    }

    @Test
    void redactsQueryStringSecretsWithoutDroppingSafeParametersBeforeGreptimeNativeStorage() {
        String redacted = redactionService.redactText(
                "GET /checkout?api.key=key-123&safe=value&region=us-east "
                        + "POST /token?access.token=tok-456&status=200");

        assertEquals("GET /checkout?api.key=[REDACTED]&safe=value&region=us-east "
                + "POST /token?access.token=[REDACTED]&status=200", redacted);
        assertFalse(redacted.contains("key-123"));
        assertFalse(redacted.contains("tok-456"));
    }

    @Test
    void redactsQueryStringAuthorizationSchemesWithoutDroppingSafeParametersBeforeGreptimeNativeStorage() {
        String redacted = redactionService.redactText(
                "GET /private?authorization=Bearer bearer-123&safe=value "
                        + "POST /basic?authorization=Basic ZGVtbzpzZWNyZXQ=&status=200");

        assertEquals("GET /private?authorization=[REDACTED]&safe=value "
                + "POST /basic?authorization=[REDACTED]&status=200", redacted);
        assertFalse(redacted.contains("bearer-123"));
        assertFalse(redacted.contains("ZGVtbzpzZWNyZXQ="));
    }
}
