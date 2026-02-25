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

package org.apache.hertzbeat.common.entity.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.job.protocol.CommonRequestProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;

/**
 * ssh tunnel
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SshTunnel implements CommonRequestProtocol, Protocol {

    /**
     * enable ssh tunnel
     */
    private String enable = "false";

    /**
     * IP ADDRESS OR DOMAIN NAME OF THE PEER HOST
     */
    private String host;

    /**
     * Peer host port
     */
    private String port = "22";

    /**
     * TIME OUT PERIOD
     */
    private String timeout = "6000";

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
     * share connection session
     */
    private String shareConnection = "true";
}
