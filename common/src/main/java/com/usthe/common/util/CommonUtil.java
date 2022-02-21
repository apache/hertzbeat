package com.usthe.common.util;

import lombok.extern.slf4j.Slf4j;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 公共工具类
 * @author tomsun28
 * @date 2021/11/20 17:29
 */
@Slf4j
public class CommonUtil {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*");

    private static final Pattern PHONE_PATTERN = Pattern.compile("^(((13[0-9])|(15[0-9])|(18[0-9])|(17[0-9]))+\\d{8})?$");

    private static final int PHONE_LENGTH = 11;

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

    /**
     * 邮箱格式校验
     * @param email 邮箱
     * @return 是否校验成功
     */
    public static boolean validateEmail(String email) {
        if (email == null || "".equals(email)) {
            return false;
        }
        Matcher m = EMAIL_PATTERN.matcher(email);
        return m.find();
    }

    /**
     * 手机号格式校验
     * @param phoneNum 手机号
     * @return 是否校验成功
     */
    public static boolean validatePhoneNum(String phoneNum) {
        if (phoneNum == null || "".equals(phoneNum) || phoneNum.length() != PHONE_LENGTH) {
            return false;
        }
        Matcher m = PHONE_PATTERN.matcher(phoneNum);
        return m.find();
    }

    /**
     * 告警级别文字转换
     * @param priority 告警级别
     * @return 告警级别文字
     */
    public static String transferAlertPriority(byte priority) {
        String priorityMsg = "警告告警";
        switch (priority) {
            case 0: priorityMsg = "紧急告警"; break;
            case 1: priorityMsg = "严重告警"; break;
            case 2: priorityMsg = "警告告警"; break;
            default: break;
        }
        return priorityMsg;
    }
}
