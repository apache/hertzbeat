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

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;

/**
 * Alarm template keyword matching replacement engine tool
 */
@Slf4j
public final class AlertTemplateUtil {

    private AlertTemplateUtil() {
    }

    /**
     * Match the variable ${key}
     * eg: Alert, the instance: ${instance} metrics: ${metrics} is over flow.
     */
    private static final Pattern PATTERN = Pattern.compile("\\$\\{(\\w+)\\}");

    public static String render(String template, Map<String, Object> replaceData) {
        if (template == null) {
            return null;  
        }
        if (replaceData == null) {
            log.warn("The replaceData is null.");
            return template;
        }
        try {
            Matcher matcher = PATTERN.matcher(template);
            StringBuilder builder = new StringBuilder();
            while (matcher.find()) {
                Object objectValue = replaceData.getOrDefault(matcher.group(1), "NullValue");
                String value = objectValue.toString();
                matcher.appendReplacement(builder, Matcher.quoteReplacement(value));
            }
            matcher.appendTail(builder);
            return builder.toString();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return template;
        }
    }
}
