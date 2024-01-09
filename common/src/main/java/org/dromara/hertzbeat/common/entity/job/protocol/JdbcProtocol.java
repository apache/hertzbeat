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
 * 公共的jdbc规范实现的数据库配置信息
 * @author tomsun28
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JdbcProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;
    /**
     * 端口号
     */
    private String port;
    /**
     * 数据库用户名(可选)
     */
    private String username;
    /**
     * 数据库密码(可选)
     */
    private String password;
    /**
     * 数据库
     */
    private String database;
    /**
     * 超时时间
     */
    private String timeout;
    /**
     * 数据库类型 mysql oracle ...
     */
    private String platform;
    /**
     * SQL查询方式： oneRow, multiRow, columns, runScript
     */
    private String queryType;
    /**
     * sql
     */
    private String sql;
    /**
     * 数据库链接url eg: jdbc:mysql://localhost:3306/usthe
     */
    private String url;
}
