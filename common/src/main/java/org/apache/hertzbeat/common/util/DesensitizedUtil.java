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

import org.apache.commons.lang3.StringUtils;

/**
 * desensitize field utility
 */
public class DesensitizedUtil {

    /**
     * desensitized field type
     */
    public enum DesensitizedType {
        MOBILE_PHONE,
        EMAIL,
        PASSWORD;
    }

    /**
     * desensitize field
     * @param str field value
     * @param desensitizedType field type
     * @return desensitized value
     */
    public static String desensitized(String str, DesensitizedType desensitizedType) {
        if (StringUtils.isEmpty(str)) {
            return "";
        }
        switch (desensitizedType) {
            case MOBILE_PHONE -> str = mobilePhone(str);
            case EMAIL -> str = email(str);
            case PASSWORD -> str = password(str);
            default -> {}
        }
        return str;
    }

    /**
     * desensitize mobile phone
     * @param str field value
     * @return desensitized value
     */
    public static String mobilePhone(String str) {
        if (StringUtils.isEmpty(str)) {
            return "";
        }
        return desensitized(str, 3, str.length() - 4);
    }

    /**
     * desensitize email
     * @param str field value
     * @return desensitized value
     */
    public static String email(String str) {
        if (StringUtils.isEmpty(str)) {
            return "";
        }
        int index = str.indexOf("@");
        if (index <= 1) {
            return str;
        }
        return desensitized(str, 1, index);
    }

    /**
     * desensitize password
     * @param str field value
     * @return desensitized value
     */
    public static String password(String str) {
        if (StringUtils.isEmpty(str)) {
            return "";
        }
        return desensitized(str, 0, str.length());
    }

    /**
     * replace char to *
     * @param str field value
     * @param start start index
     * @param end end index
     * @return desensitized value
     */
    private static String desensitized(String str, int start, int end) {
        if (StringUtils.isEmpty(str)) {
            return "";
        }
        if (start < 0 || end < 0 || end > str.length() || start >= end) {
            return str;
        }
        final StringBuilder result = new StringBuilder();
        for (int i = 0; i < str.length(); i++) {
            if (i >= start && i < end) {
                result.append("*");
            } else {
                result.append(str.charAt(i));
            }
        }
        return result.toString();
    }
}
