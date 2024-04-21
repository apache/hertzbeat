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

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Prometheus Protocol configuration
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PrometheusProtocol {
    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;
    /**
     * Peer host port
     */
    private String port;
    /**
     * http/https metrics path
     */
    private String path;
    /**
     * TIME OUT PERIOD
     */
    private String timeout;
    /**
     * http Whether to use link-encrypted ssl/tls, that is, http or https
     */
    private String ssl = "false";
    /**
     * HTTP REQUEST METHOD: get, post, put, delete, patch
     */
    private String method;
    /**
     * HTTP REQUESTS CARRY HEADERS eg: Content-Type = application/json
     */
    private Map<String, String> headers;
    /**
     * HTTP REQUESTS CARRY QUERY PARAMETERS eg: localhost:80/api?paramKey=value
     */
    private Map<String, String> params;
    /**
     * The request body carried by an http request
     */
    private String payload;
    /**
     * Authentication information
     */
    private Authorization authorization;

    /**
     * Authentication information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Authorization {
        /**
         * Authentication type：Bearer Token, Basic Auth, Digest Auth
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
