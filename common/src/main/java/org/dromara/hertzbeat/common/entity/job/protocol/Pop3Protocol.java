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
import org.apache.commons.lang3.StringUtils;

/**
 * pop3 protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Pop3Protocol {
    /**
     * 接收服务器地址
     */
    private String host;

    /**
     * 接收服务器端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * 是否开启SSL加密【邮箱传输】
     */
    private String ssl = "false";

    /**
     * pop邮箱地址
     */
    private String email;

    /**
     * 授权码
     */
    private String authorize;

    public boolean isInvalid() {
        return StringUtils.isAllBlank(host, port, timeout, ssl, email, authorize);
    }
}
