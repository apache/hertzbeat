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

package org.apache.hertzbeat.collector.dispatch;

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
     * protocol ngql
     */
    String PROTOCOL_NGQL = "ngql";
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
     * protocol registry
     */
    String PROTOCOL_REGISTRY = "registry";
    /**
     * protocol http sd
     */
    String PROTOCOL_HTTP_SD = "http_sd";
    /**
     * protocol nacos sd
     */
    String PROTOCOL_NACOS_SD = "nacos_sd";
    /**
     * protocol dns sd
     */
    String PROTOCOL_DNS_SD = "dns_sd";
    /**
     * protocol eureka sd
     */
    String PROTOCOL_EUREKA_SD = "eureka_sd";

    /**
     * protocol consul sd
     */
    String PROTOCOL_CONSUL_SD = "consul_sd";
    /**
     * protocol redfish
     */
    String PROTOCOL_REDFISH = "redfish";
    /**
     * protocol imap
     */
    String PROTOCOL_IMAP = "imap";

    /**
     * protocol script
     */
    String PROTOCOL_SCRIPT = "script";

    /**
     * protocol mqtt
     */
    String PROTOCOL_MQTT = "mqtt";

    /**
     * protocol ipmi
     */
    String PROTOCOL_IPMI = "ipmi";

    // Protocol type related - end

    // http protocol related - start should reuse HttpHeaders as much as possible
    /**
     * verification method Bearer Token
     */
    String BEARER_TOKEN = "Bearer Token";
    /**
     * Bearer Token The authentication parameter character
     */
    String BEARER = "Bearer";
    /**
     * Basic auth parameter
     */
    String BASIC = "Basic";
    /**
     * verification method authentication method Basic Auth
     */
    String BASIC_AUTH = "Basic Auth";
    /**
     * verification method authentication method Digest Auth
     */
    String DIGEST_AUTH = "Digest Auth";
    /**
     * Analysis method resolution: default rule
     */
    String PARSE_DEFAULT = "default";
    /**
     * Analysis method resolution: json path
     */
    String PARSE_JSON_PATH = "jsonPath";
    /**
     * Analysis method resolution: custom xml path
     */
    String PARSE_XML_PATH = "xmlPath";
    /**
     * Analysis method  Website availability monitoring rules Provide responseTime metrics
     */
    String PARSE_WEBSITE = "website";
    /**
     * Analysis method Sitemap site-wide availability monitoring rules
     */
    String PARSE_SITE_MAP = "sitemap";
    /**
     * Analysis method resolution: response header
     */
    String PARSE_HEADER = "header";
    /**
     * Parsing method prometheus exporter data
     */
    String PARSE_PROMETHEUS = "prometheus";
    /**
     * Parse response body as config/properties format
     */
    String PARSE_CONFIG = "config";
    /**
     * prometheus accept header
     */
    String PARSE_PROMETHEUS_ACCEPT = "application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1";
    /**
     * PromQL Prometheus Query Language
     */
    String PARSE_PROM_QL = "PromQL";
    String PARSE_PROM_QL_VECTOR = "vector";
    String PARSE_PROM_QL_MATRIX = "matrix";

    /**
     * protocol kafka
     */
    String PROTOCOL_KAFKA = "kclient";

    /**
     * protocol plc
     */
    String PROTOCOL_PLC = "plc";

    /**
     * protocol modbus
     */
    String PROTOCOL_MODBUS = "modbus";

    /**
     * protocol modbus
     */
    String PROTOCOL_S7 = "s7";
}
