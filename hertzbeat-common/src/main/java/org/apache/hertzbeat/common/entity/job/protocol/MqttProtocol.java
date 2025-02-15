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

    /**
     * ip address or domain name of the peer host
     */
    private String host;

    /**
     * peer host port
     */
    private String port;

    /**
     * username
     */
    private String username;

    /**
     * password
     */
    private String password;

    /**
     * time out period
     */
    private String timeout;

    /**
     * client id
     */
    private String clientId;

    /**
     * message used to test whether the mqtt connection can be pushed normally
     */
    private String testMessage;

    /**
     * protocol version of mqtt
     */
    private String protocolVersion;

    /**
     * monitor topic
     */
    private String topic;

    /**
     * Determine whether authentication is required
     * @return true if it has auth info
     */
    public boolean hasAuth() {
        return StringUtils.isNotBlank(this.username) && StringUtils.isNotBlank(this.password);
    }

    /**
     * Determine whether you need to test whether messages can be pushed normally
     * @return turn if it has test message
     */
    public boolean testPublish(){
        return StringUtils.isNotBlank(this.testMessage);
    }
}
