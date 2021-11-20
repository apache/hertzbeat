package com.usthe.common.util;

import lombok.extern.slf4j.Slf4j;

/**
 * 公共工具类
 *
 *
 */
@Slf4j
public class CommonUtil {

    /**
     * 将字符串str转换为double数字类型
     * @param str string
     * @return double 数字
     */
    public static Double parseDoubleStr(String str) {
        if (str == null || "".equals(str)) {
            return null;
        }
        try {
            return Double.parseDouble(str);
        } catch (Exception e) {
            log.debug(e.getMessage(), e);
            return null;
        }
    }

}
