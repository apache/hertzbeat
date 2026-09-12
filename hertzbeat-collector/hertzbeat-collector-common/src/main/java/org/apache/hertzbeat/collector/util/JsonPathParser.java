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

import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import com.jayway.jsonpath.ParseContext;
import com.jayway.jsonpath.TypeRef;
import com.jayway.jsonpath.spi.cache.CacheProvider;
import com.jayway.jsonpath.spi.cache.LRUCache;
import org.apache.commons.lang3.StringUtils;

import java.util.Collections;
import java.util.List;

/**
 * json path parser
 */
public final class JsonPathParser {

    private static final ParseContext PARSER;

    private static final ParseContext ROW_PARSER;

    static {
        Configuration conf = Configuration.defaultConfiguration()
                .addOptions(Option.DEFAULT_PATH_LEAF_TO_NULL)
                .addOptions(Option.ALWAYS_RETURN_LIST);
        CacheProvider.setCache(new LRUCache(128));
        PARSER = JsonPath.using(conf);
        // a single row legitimately may not contain the queried path
        ROW_PARSER = JsonPath.using(conf.addOptions(Option.SUPPRESS_EXCEPTIONS));
    }

    private JsonPathParser() {
    }

    /**
     * use json path to parse content 
     * @param content json content
     * @param jsonPath jsonPath
     * @return content [{'name': 'tom', 'speed': '433'},{'name': 'lili', 'speed': '543'}]
     */
    public static List<Object> parseContentWithJsonPath(String content, String jsonPath) {
        if (StringUtils.isAnyEmpty(content, jsonPath)) {
            return Collections.emptyList();
        }
        return PARSER.parse(content).read(jsonPath);
    }

    /**
     * use json path to parse content 
     * @param content json content
     * @param jsonPath jsonPath
     * @return content [{'name': 'tom', 'speed': '433'},{'name': 'lili', 'speed': '543'}]
     */
    public static <T> T parseContentWithJsonPath(String content, String jsonPath, TypeRef<T> typeRef) {
        if (StringUtils.isAnyEmpty(content, jsonPath)) {
            return null;
        }
        return PARSER.parse(content).read(jsonPath, typeRef);
    }

    /**
     * use json path to parse content, missing paths yield an empty list instead of throwing
     * @param content json content
     * @param jsonPath jsonPath
     * @return matched values, empty list when the path does not exist in the content
     */
    public static List<Object> parseContentWithOptionalJsonPath(String content, String jsonPath) {
        if (StringUtils.isAnyEmpty(content, jsonPath)) {
            return Collections.emptyList();
        }
        List<Object> values = ROW_PARSER.parse(content).read(jsonPath);
        return values == null ? Collections.emptyList() : values;
    }

    /**
     * use json path to parse one already-parsed row object, missing paths yield an empty list
     * @param document parsed json object of a single row
     * @param jsonPath jsonPath relative to the row root
     * @return matched values, empty list when the path does not exist in this row
     */
    public static List<Object> parseRowWithJsonPath(Object document, String jsonPath) {
        if (document == null || StringUtils.isEmpty(jsonPath)) {
            return Collections.emptyList();
        }
        List<Object> values = ROW_PARSER.parse(document).read(jsonPath);
        return values == null ? Collections.emptyList() : values;
    }

}
