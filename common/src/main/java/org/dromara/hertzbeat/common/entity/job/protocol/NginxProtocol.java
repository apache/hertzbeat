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

import org.apache.commons.lang3.StringUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * nginx protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NginxProtocol {
    /**
     * nginx主机ip或域名
     */
    private String host;

    /**
     * nginx主机端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * 监控模块页面url
     */
    private String url;

    /**
     * 校验相关参数
     * @return is invalid true or false
     */
    public boolean isInValid() {
        return StringUtils.isAnyBlank(host, port, timeout);
    }
}
