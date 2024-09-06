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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

/**
 * common util
 */
@Slf4j
public final class CommonUtil {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*");

    private static final Pattern PHONE_PATTERN = Pattern.compile("^(((13[0-9])|(14[0-9])|(15[0-9])|(16[0-9])|(19[0-9])|(18[0-9])|(17[0-9]))+\\d{8})?$");

    private static final Pattern NUMBER_PATTERN = Pattern.compile("^[-+]?[0-9]*\\.?[0-9]+$");
    
    private static final int PHONE_LENGTH = 11;

    private CommonUtil() {
    }

    /**
     * Converts the string str to the int numeric type
     *
     * @param str string
     * @return double number
     */
    public static Integer parseStrInteger(final String str) {
        if (StringUtils.isBlank(str)) {
            return null;
        }

        try {
            return Integer.parseInt(str);
        } catch (Exception e) {
            log.debug(e.getMessage(), e);
            return null;
        }
    }

    /**
     * Converts the string str to the double number type
     *
     * @param str string
     * @return double number
     */
    public static Double parseStrDouble(final String str) {
        if (StringUtils.isBlank(str)) {
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
     * whether the string is numeric
     * @param str string
     * @return boolean
     */
    public static boolean isNumeric(String str) {
        if (StringUtils.isBlank(str)) {
            return false;
        }
        return NUMBER_PATTERN.matcher(str).matches();
    }

    /**
     * Converts the time string str to seconds
     *
     * @param str string
     * @return double number
     */
    public static int parseTimeStrToSecond(final String str) {
        if (StringUtils.isEmpty(str)) {
            return -1;
        }

        try {
            return LocalTime.parse(str).toSecondOfDay();
        } catch (Exception e) {
            log.debug(e.getMessage(), e);
            return -1;
        }
    }

    /**
     * Converts the string str, which may contain units, to the double number type
     * Limit numeric values to four decimal places
     *
     * @param str  string
     * @param unit STRING UNIT
     * @return DOUBLE DIGITS IN STRING FORMAT Decimal point up to 4 places
     */
    public static String parseDoubleStr(String str, String unit) {
        if (StringUtils.isBlank(str)) {
            return null;
        }

        try {
            if (unit != null && str.endsWith(unit)) {
                str = str.substring(0, str.length() - unit.length());
            }
            BigDecimal bigDecimal = new BigDecimal(str);
            return bigDecimal.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
        } catch (Exception e) {
            log.debug(e.getMessage(), e);
            return null;
        }
    }

    /**
     * Mailbox format check
     *
     * @param email email
     * @return Is the verification successful
     */
    public static boolean validateEmail(final String email) {
        if (StringUtils.isBlank(email)) {
            return false;
        }

        Matcher m = EMAIL_PATTERN.matcher(email);
        return m.find();
    }

    /**
     * Mobile phone format verification
     *
     * @param phoneNum mobilePhoneNumber
     * @return Is the verification successful
     */
    public static boolean validatePhoneNum(final String phoneNum) {
        if (StringUtils.isBlank(phoneNum) || phoneNum.length() != PHONE_LENGTH) {
            return false;
        }

        Matcher m = PHONE_PATTERN.matcher(phoneNum);
        return m.find();
    }

    public static String getMessageFromThrowable(Throwable throwable) {
        if (throwable == null) {
            return "throwable is null, unknown error.";
        }
        String message = null;
        Throwable cause = throwable.getCause();
        if (cause != null) {
            message = cause.getMessage();
        }
        if (message == null || StringUtils.isBlank(message)) {
            message = throwable.getMessage();
        }
        if (message == null || StringUtils.isBlank(message)) {
            message = throwable.getLocalizedMessage();
        }
        if (message == null || StringUtils.isBlank(message)) {
            message = throwable.toString();
        }
        if (message == null || StringUtils.isBlank(message)) {
            message = "unknown error.";
        }
        return message;
    }

    public static String removeBlankLine(String value) {
        if (value == null) {
            return null;
        }
        return value.replaceAll("(?m)^\\s*$(\\n|\\r\\n)", "");
    }

    public static String getLangMappingValueFromI18nMap(String lang, Map<String, String> i18nMap) {
        if (i18nMap == null || i18nMap.isEmpty()) {
            return null;
        }
        return Optional.ofNullable(i18nMap.get(lang))
                .orElse(i18nMap.values().stream()
                        .filter(Objects::nonNull)
                        .findFirst().orElse(null));
    }

    public static void validDefineI18n(Map<String, String> i18nMap, String field) {
        if (i18nMap == null || i18nMap.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : i18nMap.entrySet()) {
            String value = entry.getValue();
            String lang = entry.getKey();
            if (StringUtils.isBlank(value)) {
                throw new IllegalArgumentException("monitoring template " + field + " " + lang + " value can not blank");
            }
        }
    }

    /**
     * generate random word
     * @param length length
     * @return words
     */
    public static String generateRandomWord(int length) {
        StringBuilder word = new StringBuilder();
        Random random = new Random();
        // 'a' ASCII
        int minVowel = 97;
        // 'z' ASCII
        int maxVowel = 122;
        // 'A' ASCII
        int minConsonant = 65;
        // 'Z' ASCII
        int maxConsonant = 90;
        // '0' ASCII
        int minDigit = 48;
        // '9' ASCII
        int maxDigit = 57;
        word.append((char) (minVowel + random.nextInt(5)));
        for (int i = 1; i < length; i++) {
            switch (random.nextInt(3)) {
                case 0:
                    word.append((char) (minVowel + random.nextInt(5)));
                    break;
                case 1:
                    word.append((char) (minDigit + random.nextInt(10)));
                    break;
                default:
                    word.append((char) (minConsonant + random.nextInt(26)));
                    break;
            }
        }
        return word.toString();
    }
}
