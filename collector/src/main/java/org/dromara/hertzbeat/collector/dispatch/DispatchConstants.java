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

package org.dromara.hertzbeat.collector.dispatch;

/**
 * dispatch  constant
 */
public interface DispatchConstants {

    /**
     * protocol http
     */
    String PROTOCOL_HTTP = "http";

    /**
     * protocol icmp
     */
    String PROTOCOL_ICMP = "icmp";
    /**
     * protocol telnet
     */
    String PROTOCOL_TELNET = "telnet";
    /**
     * protocol nginx
     */
    String PROTOCOL_NGINX = "nginx";
    /**
     * protocol smtp
     */
    String PROTOCOL_SMTP = "smtp";
    /**
     * protocol ntp
     */
    String PROTOCOL_NTP = "ntp";
    /**
     * protocol websocket
     */
    String PROTOCOL_WEBSOCKET = "websocket";
    /**
     * protocol memcached
     */
    String PROTOCOL_MEMCACHED = "memcached";
    /**
     * protocol nebulagraph
     */
    String PROTOCOL_NEBULAGRAPH = "nebulaGraph";
    /**
     * protocol udp
     */
    String PROTOCOL_UDP = "udp";
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
     * protocol mongodb
     */
    String PROTOCOL_MONGODB = "mongodb";
    /**
     * protocol jmx
     */
    String PROTOCOL_JMX = "jmx";
    /**
     * protocol snmp
     */
    String PROTOCOL_SNMP = "snmp";
    /**
     * protocol ftp
     */
    String PROTOCOL_FTP = "ftp";
    /**
     * protocol ssl Certificate - custom
     */
    String PROTOCOL_SSL_CERT = "ssl_cert";
    /**
     * protocol rocketmq
     */
    String PROTOCOL_ROCKETMQ = "rocketmq";
    /**
     * protocol push
     */
    String PROTOCOL_PUSH = "push";
    /**
     * protocol prometheus
     */
    String PROTOCOL_PROMETHEUS = "prometheus";
    /**
     * protocol dns
     */
    String PROTOCOL_DNS = "dns";
    /**
     * protocol pop3
     */
    String PROTOCOL_POP3 = "pop3";
    /**
     * protocol http_sd
     */
    String PROTOCOL_HTTP_SD = "httpsd";

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
     * Analysis method  Website availability monitoring rules Provide responseTime metrics
     * 解析方式 网站可用性监控规则 提供responseTime指标
     */
    String PARSE_WEBSITE = "website";
    /**
     * Analysis method Sitemap site-wide availability monitoring rules
     * 解析方式 网站地图全站可用性监控规则
     */
    String PARSE_SITE_MAP = "sitemap";
    /**
     * Parsing method prometheus exporter data
     * 解析方式 prometheus exporter接口获取的数据
     */
    String PARSE_PROMETHEUS = "prometheus";
    /**
     * prometheus accept header
     */
    String PARSE_PROMETHEUS_ACCEPT = "application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1";
    /**
     * PromQL Prometheus Query Language
     * 解析方式 Prometheus Query Language
     */
    String PARSE_PROM_QL = "PromQL";
    String PARSE_PROM_QL_VECTOR = "vector";
    String PARSE_PROM_QL_MATRIX = "matrix";
}
