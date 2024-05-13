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

package org.apache.hertzbeat.alert.util;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;

/**
 * date time common util
 */
@Slf4j
public final class DateUtil {

    private DateUtil() {
    }

    private static final String[] DATE_FORMATS = {
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd HH:mm:ss"
    };

    /**
     * convert date to timestamp
     * @param date date
     * @return timestamp
     */
    public static Optional<Long> getTimeStampFromSomeFormats(String date) {
        for (String dateFormat : DATE_FORMATS) {
            try {
                DateTimeFormatter dateTimeFormatter = new DateTimeFormatterBuilder()
                        .appendPattern(dateFormat)
                        // enable string conversion in strict mode.
                        .parseStrict()
                        .toFormatter();
                LocalDateTime time = LocalDateTime.parse(date, dateTimeFormatter);
                return Optional.of(time.toInstant(ZoneOffset.UTC).toEpochMilli());
            } catch (Exception e) {
                log.warn("Error parsing date '{}' with format '{}': {}",
                        date, dateFormat, e.getMessage());
            }
        }

        log.error("Error parsing date '{}', no corresponding date format", date);
        return Optional.empty();
    }

    /**
     * convert format data to timestamp
     */
    public static Optional<Long> getTimeStampFromFormat(String date, String format) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
            LocalDateTime dateTime = LocalDateTime.parse(date, formatter);
            return Optional.of(dateTime.toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        } catch (Exception e) {
            log.error("Error parsing date '{}' with format '{}': {}",
                    date, format, e.getMessage());
        }

        return Optional.empty();
    }

}
