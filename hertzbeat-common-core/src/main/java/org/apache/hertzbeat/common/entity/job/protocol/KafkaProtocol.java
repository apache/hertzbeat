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
import lombok.ToString;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.CommonUtil;

import java.util.Locale;
import java.util.Set;

/**
 * Kafka protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KafkaProtocol implements CommonRequestProtocol, Protocol {

    private static final String SASL_PLAINTEXT = "SASL_PLAINTEXT";
    private static final String SASL_SSL = "SASL_SSL";
    private static final Set<String> SECURITY_PROTOCOLS = Set.of("PLAINTEXT", SASL_PLAINTEXT, SASL_SSL);
    private static final Set<String> SASL_MECHANISMS = Set.of("SCRAM-SHA-256", "SCRAM-SHA-512");

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;

    /**
     * Port number
     */
    private String port;

    /**
     * TIME OUT PERIOD
     */
    private String timeout;

    /**
     * COMMAND
     */
    private String command;

    /**
     * Monitor internal topic
     */
    private String monitorInternalTopic = "false";

    /**
     * Kafka security protocol
     */
    private String securityProtocol;

    /**
     * SASL mechanism
     */
    private String saslMechanism;

    /**
     * SASL username
     */
    private String username;

    /**
     * SASL password
     */
    @ToString.Exclude
    private String password;

    /**
     * Determine whether SASL authentication is enabled.
     *
     * @return true if the security protocol uses SASL
     */
    public boolean hasSaslAuthentication() {
        return SASL_PLAINTEXT.equalsIgnoreCase(securityProtocol) || SASL_SSL.equalsIgnoreCase(securityProtocol);
    }

    @Override
    public boolean isInvalid() {
        if (!validateIpDomain(host) || !validPort(port)) {
            return true;
        }
        if (StringUtils.isNotBlank(timeout) && !CommonUtil.isNumeric(timeout)) {
            return true;
        }
        if (StringUtils.isNotBlank(monitorInternalTopic)
                && !"true".equalsIgnoreCase(monitorInternalTopic)
                && !"false".equalsIgnoreCase(monitorInternalTopic)) {
            return true;
        }
        if (StringUtils.isNotBlank(securityProtocol)
                && !SECURITY_PROTOCOLS.contains(securityProtocol.toUpperCase(Locale.ROOT))) {
            return true;
        }
        if (!hasSaslAuthentication()) {
            return StringUtils.isNotBlank(saslMechanism)
                    || StringUtils.isNotBlank(username)
                    || StringUtils.isNotBlank(password);
        }
        return StringUtils.isAnyBlank(saslMechanism, username, password)
                || !SASL_MECHANISMS.contains(saslMechanism.toUpperCase(Locale.ROOT));
    }
}
