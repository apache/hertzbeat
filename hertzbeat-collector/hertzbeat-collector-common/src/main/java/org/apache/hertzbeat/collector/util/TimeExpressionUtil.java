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

package org.apache.hertzbeat.collector.util;

import org.apache.commons.lang3.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * time expression deal util
 */
public final class TimeExpressionUtil {

    private TimeExpressionUtil() {
    }


    /**
     * localDatetime formatter
     */
    private static final Map<String, Function<LocalDateTime, String>> FORMATTER = new LinkedHashMap<>();
    /**
     * unit string mapping to TemporalUnit
     */
    private static final Map<Character, TemporalUnit> UNIT_MAP = new HashMap<>();

    private static final String FORMATTER_NAMES;
    private static final String UNIT_NAMES;


    static {
        FORMATTER.put("now", date -> DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").format(date));
        FORMATTER.put("date", date -> DateTimeFormatter.ofPattern("yyyy-MM-dd").format(date));
        FORMATTER.put("timestamp10", date -> String.valueOf(date.toEpochSecond(ZoneOffset.UTC)));
        FORMATTER.put("timestamp", date -> String.valueOf(date.toInstant(ZoneOffset.UTC).toEpochMilli()));
        FORMATTER.put("time", date -> DateTimeFormatter.ofPattern("HH:mm:ss").format(date));
        FORMATTER.put("year", date -> DateTimeFormatter.ofPattern("yyyy").format(date));
        FORMATTER.put("month", date -> DateTimeFormatter.ofPattern("MM").format(date));
        FORMATTER.put("day", date -> DateTimeFormatter.ofPattern("dd").format(date));
        FORMATTER.put("hour", date -> DateTimeFormatter.ofPattern("HH").format(date));
        FORMATTER.put("minute", date -> DateTimeFormatter.ofPattern("mm").format(date));
        FORMATTER.put("millisecond", date -> DateTimeFormatter.ofPattern("SSS").format(date));
        FORMATTER.put("second", date -> DateTimeFormatter.ofPattern("ss").format(date));

        UNIT_MAP.put('y', ChronoUnit.YEARS);
        UNIT_MAP.put('M', ChronoUnit.MONTHS);
        UNIT_MAP.put('d', ChronoUnit.DAYS);
        UNIT_MAP.put('H', ChronoUnit.HOURS);
        UNIT_MAP.put('m', ChronoUnit.MINUTES);
        UNIT_MAP.put('s', ChronoUnit.SECONDS);
        UNIT_MAP.put('w', ChronoUnit.WEEKS);

        FORMATTER_NAMES = String.join("|", FORMATTER.keySet());
        UNIT_NAMES = UNIT_MAP.keySet().stream().map(String::valueOf).collect(Collectors.joining(""));
    }


    public static String calculate(String template) {
        return calculate(template, LocalDateTime.now());
    }

    public static String calculate(String template, LocalDateTime now) {
        if (StringUtils.isBlank(template)) {
            return template;
        }
        final String regex = "\\$\\{(@(" + FORMATTER_NAMES + ")(\\s*[-+]\\s*\\d+[" + UNIT_NAMES + "])*)}";

        final Pattern pattern = Pattern.compile(regex, Pattern.MULTILINE);
        final Matcher matcher = pattern.matcher(template);

        while (matcher.find()) {
            String part = matcher.group(0);
            String expression = matcher.group(1);
            template = template.replace(part, calculateExpression(expression, now));

        }
        return template;
    }


    private static String calculateExpression(String expression, LocalDateTime now) {
        expression = expression.replaceAll("\\s", "");
        final String regex = "(@(" + FORMATTER_NAMES + "))|([-+]\\d+[" + UNIT_NAMES + "])";
        final Pattern pattern = Pattern.compile(regex, Pattern.MULTILINE);
        final Matcher matcher = pattern.matcher(expression);
        List<String> elements = new ArrayList<>();
        while (matcher.find()) {
            elements.add(matcher.group(0));
        }
        LocalDateTime result = now;
        for (int i = 1; i < elements.size(); i++) {
            String element = elements.get(i);
            int operator = element.charAt(0) == '-' ? -1 : 1;
            int duration = Integer.parseInt(element.substring(1, element.length() - 1));
            char unit = element.charAt(element.length() - 1);
            result = result.plus(operator * duration, UNIT_MAP.get(unit));

        }
        return FORMATTER.get(elements.get(0).substring(1)).apply(result);
    }
}
