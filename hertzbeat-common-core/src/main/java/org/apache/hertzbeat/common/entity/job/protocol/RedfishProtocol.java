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

import static org.apache.hertzbeat.common.util.IpDomainUtil.isHasSchema;
import static org.apache.hertzbeat.common.util.IpDomainUtil.validPort;
import static org.apache.hertzbeat.common.util.IpDomainUtil.validateIpDomain;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;

/**
 * Redfish Protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RedfishProtocol implements CommonRequestProtocol, Protocol {
    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;

    /**
     * Peer host port
     */
    private String port;

    /**
     * UserName
     */
    private String username;

    /**
     * Password
     */
    private String password;

    /**
     * TIME OUT PERIOD
     */
    private String timeout;

    /**
     * Redfish Resource Name and Corresponding Collection URI
     */
    private String schema;

    private List<String> jsonPath;

    @Override
    public boolean isInvalid() {
        if ((!validateIpDomain(host) && !isHasSchema(host)) || !validPort(port)) {
            return true;
        }
        if (Integer.parseInt(port) <= 0) {
            return true;
        }
        if (StringUtils.isBlank(username) || StringUtils.isBlank(password)) {
            return true;
        }
        if (!StringUtils.isNumeric(timeout)) {
            return true;
        }
        if (StringUtils.isNotBlank(schema)
                && (!schema.startsWith("/") || StringUtils.containsWhitespace(schema))) {
            return true;
        }
        if (jsonPath == null || jsonPath.isEmpty()) {
            return true;
        }
        for (String path : jsonPath) {
            if (StringUtils.isBlank(path)) {
                return true;
            }
        }
        return false;
    }
}
