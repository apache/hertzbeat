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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class SpaErrorViewResolverTest {

    @Test
    void servesIndexOnlyForRegisteredHtmlNavigations() {
        assertTrue(SpaErrorViewResolver.isSpaNavigation(request("GET", "/dashboard", "text/html")));
        assertTrue(SpaErrorViewResolver.isSpaNavigation(request("HEAD", "/entity/123", "text/html")));
        assertFalse(SpaErrorViewResolver.isSpaNavigation(request("GET", "/api/not-found", "text/html")));
        assertFalse(SpaErrorViewResolver.isSpaNavigation(request("GET", "/assets/missing.js", "text/html")));
        assertFalse(SpaErrorViewResolver.isSpaNavigation(request("POST", "/dashboard", "text/html")));
        assertFalse(SpaErrorViewResolver.isSpaNavigation(request("GET", "/dashboard", "application/json")));
        assertFalse(SpaErrorViewResolver.isSpaNavigation(request("GET", "/unknown-route", "text/html")));
    }

    private MockHttpServletRequest request(String method, String path, String accept) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("Accept", accept);
        return request;
    }
}
