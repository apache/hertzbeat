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

package com.usthe.collector.util;

import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 采集器工具类
 * @author tom
 * @date 2022/4/6 09:35
 */
@Slf4j
public class CollectUtil {

    private static final int DEFAULT_TIMEOUT = 60000;
    private static final String SMILING_PLACEHOLDER = "^_^";
    private static final String SMILING_PLACEHOLDER_REX = "\\^_\\^";
    private static final String SMILING_PLACEHOLDER_REGEX = "(\\^_\\^)(\\w|-|$|\\.)+(\\^_\\^)";
    private static final Pattern SMILING_PLACEHOLDER_REGEX_PATTERN = Pattern.compile(SMILING_PLACEHOLDER_REGEX);
    private static final String CRYING_PLACEHOLDER_REX = "\\^o\\^";
    private static final String CRYING_PLACEHOLDER_REGEX = "(\\^o\\^)(\\w|-|$|\\.)+(\\^o\\^)";
    private static final Pattern CRYING_PLACEHOLDER_REGEX_PATTERN = Pattern.compile(CRYING_PLACEHOLDER_REGEX);
    private static final List<String> UNIT_SYMBOLS = Arrays.asList("G", "g", "M", "m", "K", "k", "B", "b", "%");

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

    public static DoubleAndUnit extractDoubleAndUnitFromStr(String str) {
        if (str == null || "".equals(str)) {
            return null;
        }
        DoubleAndUnit doubleAndUnit = new DoubleAndUnit();
        try {
            Double doubleValue = Double.parseDouble(str);
            doubleAndUnit.setValue(doubleValue);
            return doubleAndUnit;
        } catch (Exception e) {
            log.debug(e.getMessage());
        }
        // extract unit from str value, eg: 23.43GB, 33KB, 44.22G
        try {
            // B KB MB GB % ....
            for (String unitSymbol : UNIT_SYMBOLS) {
                int index = str.indexOf(unitSymbol);
                if (index > 0) {
                    Double doubleValue = Double.parseDouble(str.substring(0, index));
                    String unit = str.substring(index).trim();
                    doubleAndUnit.setValue(doubleValue);
                    doubleAndUnit.setUnit(unit);
                    return doubleAndUnit;
                }
                if (index == 0) {
                    Double doubleValue = 0d;
                    String unit = str.trim();
                    doubleAndUnit.setValue(doubleValue);
                    doubleAndUnit.setUnit(unit);
                    return doubleAndUnit;
                }
            }
        } catch (Exception e) {
            log.debug(e.getMessage());
        }
        return doubleAndUnit;
    }

    /**
     * double and unit
     */
    public static final class DoubleAndUnit {

        private Double value;
        private String unit;

        public Double getValue() {
            return value;
        }

        public void setValue(Double value) {
            this.value = value;
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }
    }

    /**
     * get timeout integer
     * @param timeout timeout str
     * @return timeout
     */
    public static int getTimeout(String timeout) {
        return getTimeout(timeout, DEFAULT_TIMEOUT);
    }

    /**
     * get timeout integer or default value
     * @param timeout timeout str
     * @param defaultTimeout default timeout
     * @return timeout
     */
    public static int getTimeout(String timeout, int defaultTimeout) {
        if (timeout == null || "".equals(timeout.trim())) {
            return defaultTimeout;
        }
        try {
            return Double.valueOf(timeout).intValue();
        } catch (Exception e) {
            return defaultTimeout;
        }
    }

    /**
     * assert prom field
     */
    public static Boolean assertPromRequireField(String aliasField){
        if (CommonConstants.PROM_TIME.equals(aliasField) || CommonConstants.PROM_VALUE.equals(aliasField)){
            return true;
        }
        return false;
    }


    /**
     * is contains cryPlaceholder -_-
     * @param jsonElement json element
     * @return return true when contains
     */
    public static boolean containCryPlaceholder(JsonElement jsonElement) {
        String jsonStr = jsonElement.toString();
        return CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(jsonStr).find();
    }

    /**
     * json parameter replacement
     * json 参数替换
     *
     * @param jsonElement json
     * @param configmap   parameter map
     * @return json
     */
    public static JsonElement replaceCryPlaceholder(JsonElement jsonElement, Map<String, Configmap> configmap) {
        if (jsonElement.isJsonObject()) {
            JsonObject jsonObject = jsonElement.getAsJsonObject();
            Iterator<Map.Entry<String, JsonElement>> iterator = jsonObject.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, JsonElement> entry = iterator.next();
                JsonElement element = entry.getValue();
                // Replace normal VALUE value
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    String value = element.getAsString();
                    Matcher cryingMatcher = CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                    if (cryingMatcher.find()) {
                        cryingMatcher.reset();
                        while (cryingMatcher.find()) {
                            String group = cryingMatcher.group();
                            String replaceField = group.replaceAll(CRYING_PLACEHOLDER_REX, "");
                            Configmap param = configmap.get(replaceField);
                            if (param != null) {
                                if (param.getValue() == null) {
                                    if (group.length() == value.length()) {
                                        value = null;
                                        break;
                                    } else {
                                        value = value.replace(group, "");
                                    }
                                } else {
                                    value = value.replace(group, (String) param.getValue());
                                }
                            }
                        }
                        jsonObject.addProperty(entry.getKey(), value);
                    }
                } else {
                    jsonObject.add(entry.getKey(), replaceCryPlaceholder(entry.getValue(), configmap));
                }
            }
        } else if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            Iterator<JsonElement> iterator = jsonArray.iterator();
            int index = 0;
            while (iterator.hasNext()) {
                JsonElement element = iterator.next();
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    String value = element.getAsString();
                    Matcher cryingMatcher = CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                    if (cryingMatcher.find()) {
                        cryingMatcher.reset();
                        while (cryingMatcher.find()) {
                            String group = cryingMatcher.group();
                            String replaceField = group.replaceAll(CRYING_PLACEHOLDER_REX, "");
                            Configmap param = configmap.get(replaceField);
                            if (param != null) {
                                if (param.getValue() == null) {
                                    if (group.length() == value.length()) {
                                        value = null;
                                        break;
                                    } else {
                                        value = value.replace(group, "");
                                    }
                                } else {
                                    value = value.replace(group, (String) param.getValue());
                                }
                            }
                        }
                        jsonArray.set(index, value == null ? JsonNull.INSTANCE : new JsonPrimitive(value));
                    }
                } else {
                    jsonArray.set(index, replaceCryPlaceholder(element, configmap));
                }
                index++;
            }
        }
        return jsonElement;
    }

    /**
     * json parameter replacement
     * json 参数替换
     *
     * @param jsonElement json
     * @param configmap   parameter map
     * @return json
     */
    public static JsonElement replaceSmilingPlaceholder(JsonElement jsonElement, Map<String, Configmap> configmap) {
        if (jsonElement.isJsonObject()) {
            JsonObject jsonObject = jsonElement.getAsJsonObject();
            Iterator<Map.Entry<String, JsonElement>> iterator = jsonObject.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, JsonElement> entry = iterator.next();
                JsonElement element = entry.getValue();
                String key = entry.getKey();
                // Replace the attributes of the KEY-VALUE case such as http headers params
                // 替换KEY-VALUE情况的属性 比如http headers params
                if (key != null && key.startsWith(SMILING_PLACEHOLDER) && key.endsWith(SMILING_PLACEHOLDER)) {
                    key = key.replaceAll(SMILING_PLACEHOLDER_REX, "");
                    Configmap param = configmap.get(key);
                    if (param != null && param.getType() == (byte) 3) {
                        String jsonValue = (String) param.getValue();
                        Type type = new TypeToken<Map<String, String>>(){}.getType();
                        Map<String, String> map = GsonUtil.fromJson(jsonValue, type);
                        if (map != null) {
                            map.forEach((name, value) -> {
                                if (name != null && !"".equals(name.trim())) {
                                    jsonObject.addProperty(name, value);
                                }
                            });
                        }
                    }
                    iterator.remove();
                    continue;
                }
                // Replace normal VALUE value
                // 替换正常的VALUE值
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    // 判断是否含有特殊字符 替换
                    String value = element.getAsString();
                    Matcher smilingMatcher = SMILING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                    if (smilingMatcher.find()) {
                        smilingMatcher.reset();
                        while (smilingMatcher.find()) {
                            String group = smilingMatcher.group();
                            String replaceField = group.replaceAll(SMILING_PLACEHOLDER_REX, "");
                            Configmap param = configmap.get(replaceField);
                            if (param != null) {
                                if (param.getValue() == null) {
                                    if (group.length() == value.length()) {
                                        value = null;
                                        break;
                                    } else {
                                        value = value.replace(group, "");
                                    }
                                } else {
                                    value = value.replace(group, (String) param.getValue());
                                }
                            }
                        }
                        jsonObject.addProperty(entry.getKey(), value);
                    }
                } else {
                    jsonObject.add(entry.getKey(), replaceSmilingPlaceholder(entry.getValue(), configmap));
                }
            }
        } else if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            Iterator<JsonElement> iterator = jsonArray.iterator();
            int index = 0;
            while (iterator.hasNext()) {
                JsonElement element = iterator.next();
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    // 判断是否含有特殊字符 替换
                    String value = element.getAsString();
                    Matcher smilingMatcher = SMILING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                    if (smilingMatcher.find()) {
                        smilingMatcher.reset();
                        while (smilingMatcher.find()) {
                            String group = smilingMatcher.group();
                            String replaceField = group.replaceAll(SMILING_PLACEHOLDER_REX, "");
                            Configmap param = configmap.get(replaceField);
                            if (param != null) {
                                if (param.getValue() == null) {
                                    if (group.length() == value.length()) {
                                        value = null;
                                        break;
                                    } else {
                                        value = value.replace(group, "");
                                    }
                                } else {
                                    value = value.replace(group, (String) param.getValue());
                                }
                            }
                        }
                        jsonArray.set(index, value == null ? JsonNull.INSTANCE : new JsonPrimitive(value));
                    }
                } else {
                    jsonArray.set(index, replaceSmilingPlaceholder(element, configmap));
                }
                index++;
            }
        }
        return jsonElement;
    }

    public static String replaceUriSpecialChar(String uri) {
        uri = uri.replaceAll(" ", "%20");
        // todo more special
        return uri;
    }
}
