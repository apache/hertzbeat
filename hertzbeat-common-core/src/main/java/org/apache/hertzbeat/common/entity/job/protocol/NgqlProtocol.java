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

import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * NGQL protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NgqlProtocol implements CommonRequestProtocol, Protocol {
    private static final Set<String> VALID_PARSE_TYPES = Set.of("oneRow", "multiRow", "filterCount", "columns");

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
     * SpaceName in nebula graph
     */
    private String spaceName;

    /**
     * ngql or open cypher
     */
    private List<String> commands;

    /**
     * how to parse data
     */
    private String parseType;

    @Override
    public boolean isInvalid() {
        if (!validateIpDomain(host) || !validPort(port)) {
            return true;
        }
        if (StringUtils.isAnyBlank(username, password, timeout, parseType)) {
            return true;
        }
        if (!VALID_PARSE_TYPES.contains(parseType) || !CommonUtil.isNumeric(timeout)) {
            return true;
        }
        if (commands == null || commands.isEmpty()) {
            return true;
        }
        return commands.stream().anyMatch(StringUtils::isBlank);
    }
}
