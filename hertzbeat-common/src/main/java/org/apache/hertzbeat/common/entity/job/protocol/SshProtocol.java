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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
