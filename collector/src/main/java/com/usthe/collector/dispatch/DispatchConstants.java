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
     * protocol  协议 http
     */
    String PROTOCOL_HTTP = "http";
    /**
     * protocol  协议 icmp
     */
    String PROTOCOL_ICMP = "icmp";
    /**
     * protocol  协议 telnet
     */
    String PROTOCOL_TELNET = "telnet";
    /**
     * protocol  协议 jdbc
     */
    String PROTOCOL_JDBC = "jdbc";
    /**
     * protocol  协议 ssh
     */
    String PROTOCOL_SSH = "ssh";
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
    String PARSE_PROMETHEUS_ACCEPT = "application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1";
    // http协议相关 - end //
}
