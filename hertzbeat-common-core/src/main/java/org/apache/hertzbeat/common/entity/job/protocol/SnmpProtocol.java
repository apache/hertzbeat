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

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * snmp Protocol configuration
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SnmpProtocol implements CommonRequestProtocol, Protocol {
    private static final String OPERATION_GET = "get";
    private static final String OPERATION_WALK = "walk";

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;
    /**
     * Peer host port
     */
    private String port;
    /**
     * timeout
     */
    private String timeout;
    /**
     * snmp version v1 v2c v3
     * 0 = v1
     * 1 = v2c
     * 3 = v3
     */
    private String version;
    /**
     * community name for v1 v2
     */
    private String community;
    /**
     * username (optional)
     */
    private String username;
    /**
     * auth password (optional)
     */
    private String authPassphrase;
    /**
     * password(optional)
     */
    private String privPassphrase;
    /**
     * operation: get, walk
     */
    private String operation = "get";
    /**
     * oid map
     */
    private Map<String, String> oids;

    /**
     * contextName
     */
    private String contextName;

    /**
     * authPasswordEncryption
     * v3 requires
     */
    private String authPasswordEncryption;

    /**
     * privPasswordEncryption
     * v3 requires
     */
    private String privPasswordEncryption;

    @Override
    public boolean isInvalid() {
        if (!validateIpDomain(host) || !validPort(port) || StringUtils.isBlank(version)) {
            return true;
        }
        if (StringUtils.isNotBlank(timeout) && !CommonUtil.isNumeric(timeout)) {
            return true;
        }
        if (StringUtils.isNotBlank(operation)
                && !OPERATION_GET.equalsIgnoreCase(operation)
                && !OPERATION_WALK.equalsIgnoreCase(operation)) {
            return true;
        }
        if (oids == null || oids.isEmpty()) {
            return true;
        }
        for (Map.Entry<String, String> entry : oids.entrySet()) {
            if (StringUtils.isAnyBlank(entry.getKey(), entry.getValue())) {
                return true;
            }
        }
        if (isVersion3()) {
            return StringUtils.isAnyBlank(username, authPassphrase, privPassphrase);
        }
        if (!isVersion1Or2c()) {
            return true;
        }
        return StringUtils.isBlank(community);
    }

    private boolean isVersion1Or2c() {
        return isVersion1() || isVersion2c();
    }

    private boolean isVersion1() {
        return "0".equalsIgnoreCase(version) || "v1".equalsIgnoreCase(version);
    }

    private boolean isVersion2c() {
        return "1".equalsIgnoreCase(version)
                || "2".equalsIgnoreCase(version)
                || "2c".equalsIgnoreCase(version)
                || "v2c".equalsIgnoreCase(version);
    }

    private boolean isVersion3() {
        return "3".equalsIgnoreCase(version) || "v3".equalsIgnoreCase(version);
    }
}
