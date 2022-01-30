package com.usthe.collector.util;

import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import com.jayway.jsonpath.ParseContext;
import com.jayway.jsonpath.spi.cache.CacheProvider;
import com.jayway.jsonpath.spi.cache.LRUCache;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * json path parser
 * @author tomsun28
 * @date 2021/11/20 10:16
 */
public class JsonPathParser {

    private static final ParseContext PARSER;

    static {
        Configuration conf = Configuration.defaultConfiguration()
                .addOptions(Option.DEFAULT_PATH_LEAF_TO_NULL)
                .addOptions(Option.ALWAYS_RETURN_LIST);
        CacheProvider.setCache(new LRUCache(128));
        PARSER = JsonPath.using(conf);
    }

    /**
     * 使用jsonPath来解析json内容
     * @param content json内容
     * @param jsonPath jsonPath脚本
     * @return 解析后的内容 [{'name': 'tom', 'speed': '433'},{'name': 'lili', 'speed': '543'}]
     */
    public static List<Map<String, Object>> parseContentWithJsonPath(String content, String jsonPath) {
        if (content == null || jsonPath == null || "".equals(content) || "".equals(jsonPath)) {
            return Collections.emptyList();
        }
        return PARSER.parse(content).read(jsonPath);
    }

}
