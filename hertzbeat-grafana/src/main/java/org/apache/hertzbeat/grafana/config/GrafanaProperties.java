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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.grafana.common.GrafanaConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * grafana configuration
 */
@Slf4j
@ConfigurationProperties(prefix = ConfigConstants.FunctionModuleConstants.GRAFANA)
public record GrafanaProperties(@DefaultValue("false") boolean enabled,
                                @DefaultValue("http://127.0.0.1:3000") String url,
                                @DefaultValue("http://127.0.0.1:3000") String exposeUrl,
                                @DefaultValue(GrafanaConstants.ADMIN) String username,
                                @DefaultValue(GrafanaConstants.ADMIN) String password) {
    /**
     * get the prefix of the grafana url, such as http or https
     */
    public String getPrefix() {
        if (url.startsWith(NetworkConstants.HTTP_HEADER)) {
            return NetworkConstants.HTTP_HEADER;
        } else if (url.startsWith(NetworkConstants.HTTPS_HEADER)) {
            return NetworkConstants.HTTPS_HEADER;
        }
        return NetworkConstants.HTTP_HEADER;
    }

    /**
     * get the grafana url without the prefix, such as localhost:3000
     */
    public String getUrl() {
        if (getPrefix().equals(NetworkConstants.HTTP_HEADER)) {
            return url.replace(NetworkConstants.HTTP_HEADER, "");
        } else if (getPrefix().equals(NetworkConstants.HTTPS_HEADER)) {
            return url.replace(NetworkConstants.HTTPS_HEADER, "");
        }
        return url;
    }
}
