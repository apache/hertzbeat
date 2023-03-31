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

package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * snmp 协议配置
 * @author wangtao
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SnmpProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;
    /**
     * 对端主机端口
     */
    private String port;
    /**
     * timeout
     */
    private String timeout;
    /**
     * snmp version v1 v2c v3
     * 0 = v1
     * 1 = v2c
     * 3 = v3
     */
    private String version;
    /**
     * community name for v1 v2
     * 团体字 v1 v2 版本需要
     */
    private String community;
    /**
     * username (optional)
     */
    private String username;
    /**
     * auth password (optional)
     */
    private String authPassphrase;
    /**
     * password(optional)
     */
    private String privPassphrase;
    /**
     * operation: get, walk
     */
    private String operation = "get";
    /**
     * oid map
     */
    private Map<String, String> oids;
}
