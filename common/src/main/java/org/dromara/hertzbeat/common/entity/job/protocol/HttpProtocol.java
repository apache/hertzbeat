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

import java.util.List;
import java.util.Map;

/**
 * http 协议配置
 * @author tomsun28
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HttpProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;
    /**
     * 对端主机端口
     */
    private String port;
    /**
     * http/https 请求访问的url链接
     */
    private String url;
    /**
     * 超时时间
     */
    private String timeout;
    /**
     * http是否使用链路加密ssl/tls,即是http还是https
     */
    private String ssl = "false";
    /**
     * http请求方法: get, post, put, delete, patch
     */
    private String method;
    /**
     * http请求携带头 eg: Content-Type = application/json
     */
    private Map<String, String> headers;
    /**
     * http请求携带查询参数 eg: localhost:80/api?paramKey=value
     */
    private Map<String, String> params;
    /**
     * http请求携带的请求体
     */
    private String payload;
    /**
     * 认证信息
     */
    private Authorization authorization;
    /**
     * 响应数据解析方式
     * default - 自有的数据解析规则
     * json_path 自定义jsonPath脚本 <a href="https://www.jsonpath.cn/">...</a>
     * xml_path 自定义xmlPath脚本
     * prometheus Prometheus数据规则
     */
    private String parseType;
    /**
     * 数据解析脚本 当解析方式为 jsonPath or xmlPath时存在
     */
    private String parseScript;
    /**
     * 内容关键字
     */
    private String keyword;

    /**
     * http success status code. default 200
     * successCode means what http response status code we consider it collect success.
     */
    private List<String> successCodes;

    /**
     * 认证信息
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Authorization {
        /**
         * 认证类型：Bearer Token, Basic Auth, Digest Auth
         */
        private String type;
        /**
         * Bearer Token's token
         */
        private String bearerTokenToken;
        /**
         * Basic Auth 's username
         */
        private String basicAuthUsername;
        /**
         * Basic Auth 's password
         */
        private String basicAuthPassword;
        /**
         * Digest Auth 's username
         */
        private String digestAuthUsername;
        /**
         * Digest Auth 's password
         */
        private String digestAuthPassword;
    }
}
