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

import org.apache.commons.lang3.StringUtils;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nacos Service Discovery Protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NacosSdProtocol implements Protocol {
    /**
     * Nacos server host
     */
    private String host;
    /**
     * Nacos server port
     */
    private String port;
    /**
     * Nacos namespace
     */
    private String namespace;
    /**
     * Nacos username for authentication
     */
    private String username;
    /**
     * Nacos password for authentication
     */
    private String password;
    
    /**
     * Check if the essential protocol parameters are invalid
     * @return true if essential parameters are missing
     */
    public boolean isInvalid() {
        return StringUtils.isAnyBlank(host, port);
    }
}
