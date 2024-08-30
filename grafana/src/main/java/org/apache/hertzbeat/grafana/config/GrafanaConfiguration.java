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

package org.apache.hertzbeat.grafana.config;

import static org.apache.hertzbeat.grafana.common.CommonConstants.HTTP;
import static org.apache.hertzbeat.grafana.common.CommonConstants.HTTPS;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * grafana configuration
 */
@Slf4j
@Setter
@Getter
@Configuration
@ConfigurationProperties(prefix = "grafana")
public class GrafanaConfiguration {
    /**
     * grafana is enabled
     */
    private boolean enabled;
    /**
     * grafana url
     */
    private String url;
    /**
     * grafana username
     */
    private String username;
    /**
     * grafana password
     */
    private String password;

    /**
     * get the prefix of the grafana url, such as http or https
     */
    public String getPrefix() {
        if (url.startsWith(HTTP)) {
            return HTTP;
        } else if (url.startsWith(HTTPS)) {
            return HTTPS;
        }
        return HTTP;
    }

    /**
     * get the grafana url without the prefix, such as localhost:3000
     */
    public String getUrl() {
        if (getPrefix().equals(HTTP)) {
            return url.replace(HTTP, "");
        } else if (getPrefix().equals(HTTPS)) {
            return url.replace(HTTPS, "");
        }
        return url;
    }
}
