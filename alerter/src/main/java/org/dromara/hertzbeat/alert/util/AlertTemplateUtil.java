package org.dromara.hertzbeat.alert.util;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Alarm template keyword matching replacement engine tool
 * 告警模版关键字匹配替换引擎工具
 */
@Slf4j
public class AlertTemplateUtil {

    /**
     * Match the variable ${key}
     * 匹配 ${key} 的变量
     * eg: Alert, the instance: ${instance} metrics: ${metrics} is over flow.
     */
    private static final Pattern PATTERN = Pattern.compile("\\$\\{(\\w+)\\}");

    public static String render(String template, Map<String, Object> replaceData) {
        if (template == null) {
            return null;
        }
        try {
            Matcher matcher = PATTERN.matcher(template);
            StringBuilder builder = new StringBuilder();
            while (matcher.find()) {
                Object objectValue = replaceData.getOrDefault(matcher.group(1), "NullValue");
                String value = objectValue.toString();
                // Use Matcher.quoteReplacement to escape special characters like $ and \
                matcher.appendReplacement(builder, Matcher.quoteReplacement(value));
            }
            matcher.appendTail(builder);
            return builder.toString();
        } catch (Exception e) {
            log.error("An error occurred while rendering the alert template.", e);
            return template;
        }
    }
}
