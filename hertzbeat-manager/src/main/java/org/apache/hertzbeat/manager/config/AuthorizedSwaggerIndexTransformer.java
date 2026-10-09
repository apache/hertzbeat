/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.http.HttpServletRequest;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.core.providers.ObjectMapperProvider;
import org.springdoc.webmvc.ui.SwaggerIndexPageTransformer;
import org.springdoc.webmvc.ui.SwaggerWelcomeCommon;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.resource.ResourceTransformerChain;
import org.springframework.web.servlet.resource.TransformedResource;

/**
 * Adds the HertzBeat access token to same-origin requests made by Swagger UI.
 */
final class AuthorizedSwaggerIndexTransformer extends SwaggerIndexPageTransformer {

    private static final String SWAGGER_INITIALIZER = "swagger-initializer.js";

    private static final String PRESETS_MARKER = "presets: [";

    private static final String INTERCEPTOR_MARKER = "requestInterceptor: (request) => {";

    private static final String INTERCEPTOR_RETURN = "return request;";

    private static final String AUTHORIZATION_LOGIC = """
              const currentUrl = new URL(document.URL);
              const requestUrl = new URL(request.url, document.location.origin);
              const sameOrigin = currentUrl.protocol === requestUrl.protocol && currentUrl.host === requestUrl.host;
              const token = window.localStorage.getItem('Authorization');
              if (sameOrigin && token) {
                request.headers['Authorization'] = `Bearer ${token}`;
              }
            """;

    private static final String AUTHORIZATION_INTERCEPTOR = """
            requestInterceptor: (request) => {
            %s
              return request;
            },
            """.formatted(AUTHORIZATION_LOGIC.stripTrailing());

    AuthorizedSwaggerIndexTransformer(SwaggerUiConfigProperties swaggerUiConfig,
                                       SwaggerUiOAuthProperties swaggerUiOauthProperties,
                                       SwaggerWelcomeCommon swaggerWelcomeCommon,
                                       ObjectMapperProvider objectMapperProvider) {
        super(swaggerUiConfig, swaggerUiOauthProperties, swaggerWelcomeCommon, objectMapperProvider);
    }

    @Override
    public Resource transform(HttpServletRequest request, Resource resource,
                              ResourceTransformerChain transformerChain) throws IOException {
        final Resource transformed = super.transform(request, resource, transformerChain);
        if (!SWAGGER_INITIALIZER.equals(resource.getFilename())) {
            return transformed;
        }
        final String initializer;
        try (final var input = transformed.getInputStream()) {
            initializer = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        return new TransformedResource(transformed,
                addAuthorizationInterceptor(initializer).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Springdoc writes an interceptor of its own when csrf support is turned on. Two keys
     * of the same name would silently drop one of them, so the token is appended to the
     * body already there. It goes in at the end because the last write to a header wins,
     * and springdoc can be configured to write to {@code Authorization} as well. The
     * declarations above are named apart from the ones springdoc emits on purpose: the
     * two bodies share a scope, so a collision would be a syntax error.
     *
     * @param initializer the swagger initializer script
     * @return the script with the token attached to its outgoing requests
     */
    static String addAuthorizationInterceptor(String initializer) {
        final int interceptor = initializer.indexOf(INTERCEPTOR_MARKER);
        if (interceptor >= 0) {
            final int returnStatement = initializer.indexOf(INTERCEPTOR_RETURN,
                    interceptor + INTERCEPTOR_MARKER.length());
            if (returnStatement < 0) {
                throw new IllegalStateException("the swagger initializer interceptor no longer returns the request");
            }
            return insertLineBefore(initializer, returnStatement, AUTHORIZATION_LOGIC);
        }
        final int presets = initializer.indexOf(PRESETS_MARKER);
        if (presets < 0) {
            throw new IllegalStateException("the swagger initializer no longer contains the presets marker");
        }
        return insertLineBefore(initializer, presets, AUTHORIZATION_INTERCEPTOR);
    }

    /**
     * @param initializer the swagger initializer script
     * @param index       an index into the line to insert in front of
     * @param insertion   the lines to insert, newline terminated
     * @return the script with the insertion on its own lines, leaving the indentation of
     *         the line at {@code index} alone
     */
    private static String insertLineBefore(String initializer, int index, String insertion) {
        final int lineStart = initializer.lastIndexOf('\n', index) + 1;
        return initializer.substring(0, lineStart) + insertion + initializer.substring(lineStart);
    }
}
