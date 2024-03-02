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

/**
 * Jmx protocol
 *
 * @author huacheng
 **/
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JmxProtocol {
    /**
     * JMX host ip or domain name
     * JMX主机ip或域名
     */
    private String host;

    /**
     * The port number
     * 端口号
     */
    private String port;

    /**
     * 是否使用链路加密ssl/tls
     * enable ssl?
     */
    private String ssl = "false";

    /**
     * Jmx username (optional)
     * Jmx用户名(可选)
     */
    private String username;

    /**
     * Jmx password (optional)
     * Jmx密码(可选)
     */
    private String password;

    /**
     * jmx protocol custom collection metric address
     * jmx协议自定义收集指标地址
     */
    private String url;

    /**
     * The name of the type where the outer layer of the jmx metric is located
     * jmx指标外层所在类型名称
     */
    private String objectName;

}
