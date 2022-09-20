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

package com.usthe.common.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.http.conn.util.InetAddressUtils;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.regex.Pattern;

/**
 * ipv4 ipv6 domain 工具类
 * @author tomsun28
 * @date 2021/11/17 19:56
 */
@Slf4j
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
        if (InetAddressUtils.isIPv4Address(ipDomain)) {
            return true;
        }
        if (InetAddressUtils.isIPv6Address(ipDomain)) {
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

    /**
     * get localhost IP
     * @return ip
     */
    public static String getLocalhostIp() {
        try {
            Enumeration<NetworkInterface> allNetInterfaces = NetworkInterface.getNetworkInterfaces();
            InetAddress ip;
            while (allNetInterfaces.hasMoreElements()) {
                NetworkInterface netInterface = allNetInterfaces.nextElement();
                if (!netInterface.isLoopback() && !netInterface.isVirtual() && netInterface.isUp()) {
                    Enumeration<InetAddress> addresses = netInterface.getInetAddresses();
                    while (addresses.hasMoreElements()) {
                        ip = addresses.nextElement();
                        if (ip instanceof Inet4Address) {
                            return ip.getHostAddress();
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn(e.getMessage());
        }
        return null;
    }

}
