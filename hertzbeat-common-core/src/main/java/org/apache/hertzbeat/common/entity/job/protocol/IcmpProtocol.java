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

import static org.apache.hertzbeat.common.util.IpDomainUtil.validateIpDomain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * ICMP (PING) PROTOCOL CONFIGURATION
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class IcmpProtocol implements CommonRequestProtocol, Protocol {

    /**
     * ip address or domain name of the peer host
     */
    private String host;

    /**
     * time out period
     */
    private String timeout;

    @Override
    public void setPort(String port) {
    }

    @Override
    public boolean isInvalid() {
        if (!validateIpDomain(host)) {
            return true;
        }
        return StringUtils.isNotBlank(timeout) && !CommonUtil.isNumeric(timeout);
    }
}
