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

import static org.apache.hertzbeat.common.util.IpDomainUtil.validPort;
import static org.apache.hertzbeat.common.util.IpDomainUtil.validateIpDomain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;

/**
 * Jmx protocol
 **/
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JmxProtocol implements CommonRequestProtocol, Protocol {
    /**
     * JMX host ip or domain name
     */
    private String host;

    /**
     * The port number
     */
    private String port;

    /**
     * enable ssl?
     */
    private String ssl = "false";

    /**
     * Jmx username (optional)
     */
    private String username;

    /**
     * Jmx password (optional)
     */
    private String password;

    /**
     * jmx protocol custom collection metric address
     */
    private String url;

    /**
     * The name of the type where the outer layer of the jmx metric is located
     */
    private String objectName;

    @Override
    public boolean isInvalid() {
        if (StringUtils.isBlank(objectName)) {
            return true;
        }
        if (StringUtils.isNotBlank(ssl)
                && !"true".equalsIgnoreCase(ssl)
                && !"false".equalsIgnoreCase(ssl)) {
            return true;
        }
        if (StringUtils.isNotBlank(username) && StringUtils.isBlank(password)) {
            return true;
        }
        if (StringUtils.isBlank(username) && StringUtils.isNotBlank(password)) {
            return true;
        }
        if (StringUtils.isNotBlank(url)) {
            return !url.startsWith("service:jmx:rmi:") || url.contains("/stub/");
        }
        if (!validateIpDomain(host) || !validPort(port)) {
            return true;
        }
        return Integer.parseInt(port) <= 0;
    }
}
