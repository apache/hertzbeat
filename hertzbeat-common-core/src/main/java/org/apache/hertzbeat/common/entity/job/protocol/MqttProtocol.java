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
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * mqtt protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MqttProtocol implements CommonRequestProtocol, Protocol {

    /**
     * mqtt client id
     */
    private String clientId;
    /**
     * mqtt username
     */
    private String username;
    /**
     * mqtt password
     */
    private String password;
    /**
     * mqtt host
     */
    private String host;
    /**
     * mqtt port
     */
    private String port;
    /**
     * mqtt protocol version
     * MQTT,MQTTS
     */
    private String protocol;
    /**
     * mqtt connect timeout
     * the maximum time to wait for a connection to be established
     */
    private String timeout;
    /**
     * mqtt keepalive
     * between ping requests to the broker to keep the connection alive
     */
    private String keepalive;
    /**
     * mqtt topic name
     */
    private String topic;
    /**
     * mqtt publish message
     */
    private String testMessage;
    /**
     * mqtt tls version
     * TLSv1.2, TLSv1.3
     */
    private String tlsVersion;
    /**
     * mqtt tls insecure skip verify server certificate
     */
    private String insecureSkipVerify;
    /**
     * mqtt tls ca cert
     */
    private String caCert;
    /**
     * mqtt tls enable mutual auth
     */
    private String enableMutualAuth;
    /**
     * mqtt tls client cert
     */
    private String clientCert;
    /**
     * mqtt tls client key
     */
    private String clientKey;

    /**
     * Determine whether authentication is required
     * @return true if it has auth info
     */
    public boolean hasAuth() {
        return StringUtils.isNotBlank(this.username) && StringUtils.isNotBlank(this.password);
    }

    @Override
    public boolean isInvalid() {
        if (!validateIpDomain(host) || !validPort(port)) {
            return true;
        }
        if (StringUtils.isNotBlank(timeout) && !CommonUtil.isNumeric(timeout)) {
            return true;
        }
        if (StringUtils.isNotBlank(keepalive) && !CommonUtil.isNumeric(keepalive)) {
            return true;
        }
        if (StringUtils.isNotBlank(protocol)
                && !"MQTT".equalsIgnoreCase(protocol)
                && !"MQTTS".equalsIgnoreCase(protocol)) {
            return true;
        }
        if (StringUtils.isNotBlank(tlsVersion)
                && !"TLSv1.2".equalsIgnoreCase(tlsVersion)
                && !"TLSv1.3".equalsIgnoreCase(tlsVersion)) {
            return true;
        }
        if (StringUtils.isNotBlank(insecureSkipVerify)
                && !"true".equalsIgnoreCase(insecureSkipVerify)
                && !"false".equalsIgnoreCase(insecureSkipVerify)) {
            return true;
        }
        if (StringUtils.isNotBlank(enableMutualAuth)
                && !"true".equalsIgnoreCase(enableMutualAuth)
                && !"false".equalsIgnoreCase(enableMutualAuth)) {
            return true;
        }
        return false;
    }

}
