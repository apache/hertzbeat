package com.usthe.common.util;

import java.util.Base64;

/**
 * base64工具类
 *
 *
 */
public class Base64Util {

    public static boolean isBase64(String base64) {
        try {
            return Base64.getDecoder().decode(base64) != null;
        } catch (Exception e) {
            return false;
        }
    }
}
