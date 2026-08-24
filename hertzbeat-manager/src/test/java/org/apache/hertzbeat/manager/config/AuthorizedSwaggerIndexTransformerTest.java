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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AuthorizedSwaggerIndexTransformer}.
 */
class AuthorizedSwaggerIndexTransformerTest {

    @Test
    void shouldAttachTheHertzBeatTokenToSameOriginRequests() {
        final String initializer = """
                window.ui = SwaggerUIBundle({
                  configUrl: "/v3/api-docs/swagger-config",
                  presets: [SwaggerUIBundle.presets.apis]
                });
                """;

        final String transformed = AuthorizedSwaggerIndexTransformer.addAuthorizationInterceptor(initializer);

        assertTrue(transformed.contains("window.localStorage.getItem('Authorization')"));
        assertTrue(transformed.contains("request.headers['Authorization'] = `Bearer ${token}`"));
        assertTrue(transformed.contains("sameOrigin && token"));
        assertTrue(transformed.contains("presets: [SwaggerUIBundle.presets.apis]"));
    }

    @Test
    void shouldFailClosedWhenTheSwaggerInitializerShapeChanges() {
        assertThrows(IllegalStateException.class,
                () -> AuthorizedSwaggerIndexTransformer.addAuthorizationInterceptor("window.ui = {};"));
    }

    /**
     * Springdoc writes an interceptor of its own when csrf support is turned on, and it
     * can be configured to write to the {@code Authorization} header too. The last write
     * wins, so ours has to come after the one already there.
     */
    @Test
    void shouldComposeWithAnExistingRequestInterceptor() {
        final String initializer = """
                window.ui = SwaggerUIBundle({
                  requestInterceptor: (request) => {
                    request.headers['Authorization'] = 'csrf';
                    return request;
                  },
                  presets: [SwaggerUIBundle.presets.apis]
                });
                """;

        final String transformed = AuthorizedSwaggerIndexTransformer.addAuthorizationInterceptor(initializer);

        assertTrue(transformed.contains("request.headers['Authorization'] = 'csrf'"));
        assertTrue(transformed.indexOf("request.headers['Authorization'] = `Bearer ${token}`")
                        > transformed.indexOf("request.headers['Authorization'] = 'csrf'"),
                "the token has to be written after the interceptor that was already there");
        assertEquals(1, countOf(transformed, "requestInterceptor:"),
                "a second key of the same name would drop one of the two interceptors");
    }

    @Test
    void shouldFailClosedWhenTheExistingInterceptorDoesNotReturnTheRequest() {
        final String initializer = """
                window.ui = SwaggerUIBundle({
                  requestInterceptor: (request) => {
                  presets: [SwaggerUIBundle.presets.apis]
                """;

        assertThrows(IllegalStateException.class,
                () -> AuthorizedSwaggerIndexTransformer.addAuthorizationInterceptor(initializer));
    }

    /**
     * @param initializer the transformed script
     * @param token       the substring to count
     * @return how many times the substring occurs
     */
    private static int countOf(String initializer, String token) {
        int count = 0;
        for (int index = initializer.indexOf(token); index >= 0; index = initializer.indexOf(token, index + 1)) {
            count++;
        }
        return count;
    }
}
