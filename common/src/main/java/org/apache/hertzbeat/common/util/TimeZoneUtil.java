package org.apache.hertzbeat.common.util;

import java.util.Locale;
import java.util.TimeZone;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;

/**
 * timezone util
 */
public class TimeZoneUtil {
    private static final Integer LANG_REGION_LENGTH = 2;

    public static void setTimeZoneAndLocale(String timeZoneId, String locale) {
        setTimeZone(timeZoneId);
        setLocale(locale);
    }

    public static void setTimeZone(String timeZoneId) {
        if (StringUtils.isBlank(timeZoneId)) {
            return;
        }

        TimeZone.setDefault(TimeZone.getTimeZone(timeZoneId));
    }

    public static void setLocale(String locale) {
        if (StringUtils.isBlank(locale)) {
            return;
        }

        String[] arr = locale.split(CommonConstants.LOCALE_SEPARATOR);
        if (arr.length == LANG_REGION_LENGTH) {
            String language = arr[0];
            String country = arr[1];
            Locale.setDefault(new Locale(language, country));
        }
    }
}
