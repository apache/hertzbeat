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

package org.dromara.hertzbeat.alert.util;

import lombok.extern.slf4j.Slf4j;

import java.text.ParseException;
import java.text.SimpleDateFormat;

/**
 * date time common util
 */
@Slf4j
public class DateUtil {

    private static final String[] DATE_FORMATS = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd HH:mm:ss"};

    /**
     * convert date to timestamp
     * @param date date
     */
    public static Long getTimeStampFromSomeFormats(String date) {
        SimpleDateFormat sdf;
        for (String dateFormat : DATE_FORMATS) {
            try {
                sdf = new SimpleDateFormat(dateFormat);
                return sdf.parse(date).getTime();
            } catch (ParseException e) {
                log.error(e.getMessage());
            }
        }
        return null;
    }

    /**
     * convert format data to timestamp
     */
    public static Long getTimeStampFromFormat(String date, String format) {
        SimpleDateFormat sdf = new SimpleDateFormat(format);
        try {
            return sdf.parse(date).getTime();
        } catch (Exception e) {
            log.error(e.getMessage());
        }
        return null;
    }

}
