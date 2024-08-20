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

package org.apache.hertzbeat.common.util;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.UnknownHostException;
import java.util.Enumeration;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.core5.net.InetAddressUtils;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.springframework.util.StringUtils;

/**
 * ipv4 ipv6 domain util.
 */
@Slf4j
public final class IpDomainUtil {
    
    private static final Pattern DOMAIN_PATTERN =
            Pattern.compile("^[-\\w]+(\\.[-\\w]+)*$");

    private static final String LOCALHOST = "localhost";

    /**
     * HTTP header schema.
     */
    private static final Pattern DOMAIN_SCHEMA = Pattern.compile("^([hH][tT]{2}[pP]://|[hH][tT]{2}[pP][sS]://){1}[^\\s]*");

    private IpDomainUtil() {
    }

    /**
     * whether it is ip or domain.
     * @param ipDomain ip domain string
     * @return true-yes false-no
     */
    public static boolean validateIpDomain(String ipDomain) {
        if (ipDomain == null || !StringUtils.hasText(ipDomain)) {
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
     * if domain or ip has http / https schema.
     * @param domainIp host
     * @return true or false
     */
    public static boolean isHasSchema(String domainIp) {
        if (domainIp == null || !StringUtils.hasText(domainIp)) {
            return false;
        }
        return DOMAIN_SCHEMA.matcher(domainIp).matches();
    }

    /**
     * get localhost IP.
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
    
    /**
     * check IP address type.
     * @param ipDomain ip domain
     * @return IP address type
     */
    public static String checkIpAddressType(String ipDomain){
        if (StringUtils.hasText(ipDomain) && InetAddressUtils.isIPv6Address(ipDomain)) {
            return NetworkConstants.IPV6;
        }
        return NetworkConstants.IPV4;
    }
    
    /**
     * get current local host name.
     * @return hostname
     */
    public static String getCurrentHostName() {
        try {
            InetAddress inetAddress = InetAddress.getLocalHost();
            return inetAddress.getHostName();   
        } catch (UnknownHostException e) {
            return null;
        }
    }

}
