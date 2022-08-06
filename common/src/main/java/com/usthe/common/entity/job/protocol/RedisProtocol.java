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

package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @version 1.0
 * Created by Musk.Chen on 2022/5/17
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RedisProtocol {

    /**
     * 对端主机ip或域名
     */
    private String host;

    /**
     * 端口号
     */
    private String port;

    /**
     * Redis用户名(可选)
     */
    private String username;

    /**
     * Redis密码(可选)
     */
    private String password;

    /**
     * 超时时间
     */
    private String timeout;

}
