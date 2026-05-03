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
 * ssh Protocol parameter configuration
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SshProtocol implements CommonRequestProtocol, Protocol {

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;

    /**
     * Peer host port
     */
    private String port;

    /**
     * TIME OUT PERIOD
     */
    private String timeout;

    /**
     * UserName
     */
    private String username;

    /**
     * Password (optional)
     */
    private String password;

    /**
     * Private key (optional)
     */
    private String privateKey;

    /**
     * private key passphrase (optional)
     */
    private String privateKeyPassphrase;

    /**
     * reuse connection session
     */
    private String reuseConnection = "true";

    /**
     * SSH execution script
     */
    private String script;

    /**
     * Response data parsing mode：oneRow, multiRow
     */
    private String parseType;

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER PROXY HOST
     */
    private String proxyHost;

    /**
     * Peer proxy host port
     */
    private String proxyPort;

    /**
     * Proxy UserName
     */
    private String proxyUsername;

    /**
     * Proxy Password (optional)
     */
    private String proxyPassword;

    /**
     * flag of use proxy
     */
    private String useProxy = "false";

    /**
     * Proxy private key (optional)
     */
    private String proxyPrivateKey;

    @Override
    public boolean isInvalid() {
        if (!validateIpDomain(host) || !validPort(port)) {
            return true;
        }
        if (StringUtils.isNotBlank(timeout) && !CommonUtil.isNumeric(timeout)) {
            return true;
        }
        if (StringUtils.isNotBlank(reuseConnection)
                && !"true".equalsIgnoreCase(reuseConnection)
                && !"false".equalsIgnoreCase(reuseConnection)) {
            return true;
        }
        if (StringUtils.isNotBlank(useProxy)
                && !"true".equalsIgnoreCase(useProxy)
                && !"false".equalsIgnoreCase(useProxy)) {
            return true;
        }
        if ("true".equalsIgnoreCase(useProxy)) {
            if (!validateIpDomain(proxyHost) || !validPort(proxyPort)) {
                return true;
            }
        }
        return false;
    }
}
