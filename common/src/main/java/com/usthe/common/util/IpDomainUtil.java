package com.usthe.common.util;

import sun.net.util.IPAddressUtil;

import java.util.regex.Pattern;

/**
 * ipv4 ipv6 domain 工具类
 * @author tomsun28
 * @date 2021/11/17 19:56
 */
public class IpDomainUtil {

    /**
     * 域名校验正则
     */
    private static final Pattern DOMAIN_PATTERN =
            Pattern.compile("^(?=^.{3,255}$)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$");

    private static final String LOCALHOST = "localhost";

    /**
     * HTTP协议头校验规则
     */
    private static final Pattern DOMAIN_SCHEMA = Pattern.compile("^([hH][tT]{2}[pP]://|[hH][tT]{2}[pP][sS]://){1}[^\\s]*");

    /**
     * 校验判断是否是 ip或者domain
     * @param ipDomain ip domain string
     * @return true-yes false-no
     */
    public static boolean validateIpDomain(String ipDomain) {
        if (ipDomain == null || "".equals(ipDomain)) {
            return false;
        }
        ipDomain = ipDomain.trim();
        if (LOCALHOST.equalsIgnoreCase(ipDomain)) {
            return true;
        }
        if (IPAddressUtil.isIPv4LiteralAddress(ipDomain)) {
            return true;
        }
        if (IPAddressUtil.isIPv6LiteralAddress(ipDomain)) {
            return true;
        }
        return DOMAIN_PATTERN.matcher(ipDomain).matches();
    }

    /**
     * 判断 domain or ip 是否存在http / https 头
     * @param domainIp host
     * @return 存在true
     */
    public static boolean isHasSchema(String domainIp) {
        if (domainIp == null || "".equals(domainIp)) {
            return false;
        }
        return DOMAIN_SCHEMA.matcher(domainIp).matches();
    }

}
