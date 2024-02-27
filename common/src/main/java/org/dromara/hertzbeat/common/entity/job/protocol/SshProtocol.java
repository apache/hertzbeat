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
 * ssh 协议参数配置
 * @author tom
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SshProtocol {

    /**
     * 对端主机ip或域名
     */
    private String host;

    /**
     * 对端主机端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * 用户名
     */
    private String username;

    /**
     * 密码(可选)
     */
    private String password;

    /**
     * 私钥(可选)
     */
    private String privateKey;
    
    /**
     * reuse connection session
     */
    private String reuseConnection = "true";

    /**
     * SSH执行脚本
     */
    private String script;

    /**
     * 响应数据解析方式：oneRow, multiRow
     */
    private String parseType;
}
