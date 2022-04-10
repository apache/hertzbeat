package com.usthe.collector.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 采集器工具类
 * @author tom
 * @date 2022/4/6 09:35
 */
public class CollectUtil {

    /**
     * 关键字匹配计数
     * @param content 内容
     * @param keyword 关键字
     * @return 匹配次数
     */
    public static int countMatchKeyword(String content, String keyword) {
        if (content == null || "".equals(content) || keyword == null || "".equals(keyword.trim())) {
            return 0;
        }
        try {
            Pattern pattern = Pattern.compile(keyword);
            Matcher matcher = pattern.matcher(content);
            int count = 0;
            while (matcher.find()) {
                count++;
            }
            return count;
        } catch (Exception e) {
            return 0;
        }
    }
}
