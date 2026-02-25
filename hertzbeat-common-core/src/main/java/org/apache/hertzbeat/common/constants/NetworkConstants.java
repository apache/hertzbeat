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

package org.apache.hertzbeat.common.constants;

/**
 * Http Constants.
 */

public interface NetworkConstants {

    String KEEP_ALIVE = "Keep-Alive";

    String USER_AGENT = "Mozilla/5.0 (Windows NT 6.1; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36";

    String IPV6 = "ipv6";

    String IPV4 = "ipv4";

    String ERROR_MSG = "errorMsg";

    String URL = "url";

    String HTTP_HEADER = "http://";

    String HTTPS_HEADER = "https://";

    String RESPONSE_TIME = "responseTime";

    String STATUS_CODE = "StatusCode";

    String X_AUTH_TOKEN = "X-Auth-Token";

    String LOCATION = "Location";

    String BASIC = "Basic";

    String AUTHORIZATION = "Authorization";

    /**
     * HttpClient Configuration Constants.
     */
    interface HttpClientConstants {

        int READ_TIME_OUT = 6 * 1000;
        int WRITE_TIME_OUT = 6 * 1000;
        int CONNECT_TIME_OUT = 6 * 1000;
        int MAX_IDLE_CONNECTIONS = 20;
        int KEEP_ALIVE_TIMEOUT = 30 * 1000;
    }

}
