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

package org.apache.hertzbeat.common.entity.job.protocol;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * http protocol configuration
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HttpProtocol implements CommonRequestProtocol, Protocol {
    /**
     * Peer host ip or domain name
     */
    private String host;
    /**
     * port number
     */
    private String port;
    /**
     * http/https The url link to which the request was made
     */
    private String url;
    /**
     * timeout
     */
    private String timeout;
    /**
     * Whether http uses link encryption ssl/tls, i.e. http or https
     */
    private String ssl = "false";
    /**
     * http request methods: get, post, put, delete, patch
     */
    private String method;
    /**
     * http requests carry headers eg: Content-Type = application/json
     */
    private Map<String, String> headers;
    /**
     * http requests carry query parameters eg: localhost:80/api? paramKey=value
     */
    private Map<String, String> params;
    /**
     * The body carried by an http request
     */
    private String payload;
    /**
     * authentication information
     */
    private Authorization authorization;
    /**
     * How response data is parsed
     * default - Own rules for parsing data
     * json_path Custom jsonPath scripts <a href="https://www.jsonpath.cn/">...</a>
     * xml_path Custom xmlPath scripts
     * prometheus Prometheus Data Rules
     */
    private String parseType;
    /**
     * Data parsing scripts exist when parsed as jsonPath or xmlPath
     */
    private String parseScript;
    /**
     * Content keywords
     */
    private String keyword;

    /**
     * http success status code. default 200
     * successCode means what http response status code we consider it collect success.
     */
    private List<String> successCodes;

    /**
     * Whether to enable URL encoding for the path. Default is true.
     * When true, the URL path will be encoded. When false, the URL path will not be encoded.
     */
    private String enableUrlEncoding = "true";

    /**
     * authentication information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Authorization {
        /**
         * certification type：Bearer Token, Basic Auth, Digest Auth
         */
        private String type;
        /**
         * Bearer Token's token
         */
        private String bearerTokenToken;
        /**
         * Basic Auth 's username
         */
        private String basicAuthUsername;
        /**
         * Basic Auth 's password
         */
        private String basicAuthPassword;
        /**
         * Digest Auth 's username
         */
        private String digestAuthUsername;
        /**
         * Digest Auth 's password
         */
        private String digestAuthPassword;
    }
}
