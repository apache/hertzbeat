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

package org.dromara.hertzbeat.common.constants;

/**
 * collector constant
 * @author tom
 */
public interface CollectorConstants {

    String RESPONSE_TIME = "responseTime";

    String KEYWORD = "keyword";

    String STATUS_CODE = "statusCode";

    String ERROR_MSG = "errorMsg";

    String URL = "url";

    String HTTP_HEADER = "http://";

    String HTTPS_HEADER = "https://";

    /**
     * POSTGRESQL un reachable status code
     */
    String POSTGRESQL_UN_REACHABLE_CODE = "08001";

    String IPV6 = "ipv6";
    String IPV4 = "ipv4";
}
