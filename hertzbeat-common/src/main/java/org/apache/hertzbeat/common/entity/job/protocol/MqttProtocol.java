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
import org.apache.commons.lang3.StringUtils;

/**
 * mqtt protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MqttProtocol implements CommonRequestProtocol, Protocol {

    private String clientId;
    private String username;
    private String password;
    private String host;
    private String port;
    private String protocol;
    private String timeout;
    private String keepalive;
    private String topic;
    private String testMessage;
    private String tlsVersion;
    private String insecureSkipVerify;
    private String caCert;
    private String enableMutualAuth;
    private String clientCert;
    private String clientKey;








    /**
     * Determine whether authentication is required
     * @return true if it has auth info
     */
    public boolean hasAuth() {
        return StringUtils.isNotBlank(this.username) && StringUtils.isNotBlank(this.password);
    }

}
