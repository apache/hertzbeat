package com.usthe.collector.util;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * prometheus-format-text parser
 * @author tom
 * @date 2022/1/9 14:12
 */
public class PrometheusTextParser {

    /**
     * 解析prometheusText
     * @param content 待解析文本内容
     * @return eg:[{'name': 'tom', 'speed': '433'},{'name': 'lili', 'speed': '543'},{'name': 'sam', 'speed': '643'}]
     */
    public static Map<String, List<Map<String, Object>>> parsePrometheusText(String content) {
        String[] lines = content.split("\n");
        Map<String, List<Map<String, Object>>> parseResult = new HashMap<>(8);
        for (String lineTmp : lines) {
            String line = lineTmp.trim();
            if (line.length() == 0 || line.startsWith("#")) {
                continue;
            }
            
        }
        return null;
    }
}
