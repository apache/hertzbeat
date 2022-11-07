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

package com.usthe.collector.dispatch;

/**
 * dispatch  constant 常量
 *
 * @author tomsun28
 * @date 2021/11/3 16:50
 */
public interface DispatchConstants {

    // Protocol type related    协议类型相关 - start //
    /**
     * protocol http
     */
    String PROTOCOL_HTTP = "http";

    /**
     * protocol  微服务http
     */
    String PROTOCOL_HTTP_MICRO = "http_micro";

    /**
     * protocol icmp
     */
    String PROTOCOL_ICMP = "icmp";
    /**
     * protocol telnet
     */
    String PROTOCOL_TELNET = "telnet";
    /**
     * protocol jdbc
     */
    String PROTOCOL_JDBC = "jdbc";
    /**
     * protocol ssh
     */
    String PROTOCOL_SSH = "ssh";
    /**
     * protocol redis
     */
    String PROTOCOL_REDIS = "redis";
    /**
     * protocol
     */
    String PROTOCOL_DM = "dm";
    /**
     * protocol jmx
     */
    String PROTOCOL_JMX = "jmx";
    /**
     * protocol snmp
     */
    String PROTOCOL_SNMP = "snmp";
    /**
     * protocol ssl Certificate - custom
     */
    String PROTOCOL_SSL_CERT = "ssl_cert";
    /**
     * protocol 协议 k8s
     */
    String PROTOCOL_K8S = "k8s";

    /**
     * protocol  协议 microService
     */
    String PROTOCOL_SERVICE = "service";
    // Protocol type related - end
    // 协议类型相关 - end //

    // http protocol related - start should reuse HttpHeaders as much as possible
    // http协议相关 - start 需尽可能先复用 HttpHeaders //
    /**
     * verification method   认证方式 Bearer Token
     */
    String BEARER_TOKEN = "Bearer Token";
    /**
     * Bearer Token The authentication parameter character
     * Bearer Token 的认证参数字符
     */
    String BEARER = "Bearer";
    /**
     * Basic auth parameter
     */
    String BASIC = "Basic";
    /**
     * verification method  认证方式 Basic Auth
     */
    String BASIC_AUTH = "Basic Auth";
    /**
     * verification method  认证方式 Digest Auth
     */
    String DIGEST_AUTH = "Digest Auth";
    /**
     * Analysis method  解析规则 默认规则
     */
    String PARSE_DEFAULT = "default";
    /**
     * Analysis method   解析方式 自定义json path
     */
    String PARSE_JSON_PATH = "jsonPath";
    /**
     * Analysis method   解析方式 自定义xml path
     */
    String PARSE_XML_PATH = "xmlPath";
    /**
     * Analysis method  Website availability monitoring rules Provide responseTime indicators
     * 解析方式 网站可用性监控规则 提供responseTime指标
     */
    String PARSE_WEBSITE = "website";
    /**
     * Analysis method Sitemap site-wide availability monitoring rules
     * 解析方式 网站地图全站可用性监控规则
     */
    String PARSE_SITE_MAP = "sitemap";
    /**
     * Parsing method prometheus rules
     * 解析方式 prometheus规则
     */
    String PARSE_PROMETHEUS = "prometheus";
    String PARSE_MICRO = "micro";

    String PARSE_CHAIN_REQUESTS = "requests";
    String PARSE_PROMETHEUS_ACCEPT = "application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1";
    String PARSE_PROMETHEUS_VECTOR = "vector";
    String PARSE_PROMETHEUS_MATRIX = "matrix";

    // http协议相关 - end //
    // k8s相关 -- start//
    /**
     * k8s 解析数据按照获取值的方式
     */
    String PARSE_SINGLE = "single";
    /**
     * k8s 解析数据算数组的大小
     */
    String PARSE_GROUP = "group";
    // k8s相关 -- end//
    // 微服务相关 -- start//
    /**
     * 参数configParam的key
     */
    String CHILD_REQUESTS = "requests";
    /**
     * 通用解析链路
     */
    String PARSE_CHAIN_COMMON = "common";
}
