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

package org.apache.hertzbeat.ai.gateway.text;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Test case for {@link GatewayText}.
 */
class GatewayTextTest {

    @Test
    void safeSummaryShouldRedactCommonSecretForms() {
        String summary = GatewayText.safeSummary("""
            password=hunter2 token=tok-secret apiKey=api-secret api_key=api-secret-2
            authorization=Bearer auth-secret accessToken=access-secret
            callback=/api?access_token=query-secret&ok=true
            """, 2048);

        assertNoRawSecret(summary);
        assertTrue(summary.contains("[REDACTED]"));
    }

    private void assertNoRawSecret(String text) {
        assertFalse(text.contains("hunter2"));
        assertFalse(text.contains("tok-secret"));
        assertFalse(text.contains("api-secret"));
        assertFalse(text.contains("api-secret-2"));
        assertFalse(text.contains("auth-secret"));
        assertFalse(text.contains("access-secret"));
        assertFalse(text.contains("query-secret"));
    }
}
