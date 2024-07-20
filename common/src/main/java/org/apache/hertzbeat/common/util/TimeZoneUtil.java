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

import java.util.Locale;
import java.util.TimeZone;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;

/**
 * timezone util
 */
public final class TimeZoneUtil {

    private TimeZoneUtil() {
    }

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
