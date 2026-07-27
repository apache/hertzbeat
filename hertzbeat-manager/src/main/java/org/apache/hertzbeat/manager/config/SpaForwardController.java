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

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards known browser routes to the packaged React application.
 *
 * <p>The explicit root list prevents missing API and static-asset paths from being hidden by the SPA fallback.
 */
@Controller
public class SpaForwardController {

    private static final String INDEX_FORWARD = "forward:/index.html";

    @GetMapping(
            value = {
                    "/alerts", "/alerts/**",
                    "/bulletin", "/bulletin/**",
                    "/dashboard", "/dashboard/**",
                    "/entities", "/entities/**",
                    "/explore", "/explore/**",
                    "/ingestion", "/ingestion/**",
                    "/log", "/log/**",
                    "/monitors", "/monitors/**",
                    "/observability", "/observability/**",
                    "/overview", "/overview/**",
                    "/passport", "/passport/**",
                    "/setting", "/setting/**",
                    "/settings", "/settings/**",
                    "/status", "/status/**",
                    "/topology", "/topology/**"
            },
            produces = MediaType.TEXT_HTML_VALUE
    )
    public String forwardToIndex() {
        return INDEX_FORWARD;
    }
}
