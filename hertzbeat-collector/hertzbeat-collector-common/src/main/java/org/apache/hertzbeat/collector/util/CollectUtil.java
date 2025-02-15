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

import com.beetstra.jutf7.CharsetProvider;
import com.fasterxml.jackson.core.type.TypeReference;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * util for collector
 */
@Slf4j
public final class CollectUtil {

    private static final int DEFAULT_TIMEOUT = 60000;
    private static final int HEX_STR_WIDTH = 2;
    private static final String SMILING_PLACEHOLDER = "^_^";
    private static final String SMILING_PLACEHOLDER_REX = "\\^_\\^";
    private static final String SMILING_PLACEHOLDER_REGEX = "(\\^_\\^)(\\w|-|$|\\.)+(\\^_\\^)";
    private static final Pattern SMILING_PLACEHOLDER_REGEX_PATTERN = Pattern.compile(SMILING_PLACEHOLDER_REGEX);
    private static final String CRYING_PLACEHOLDER_REX = "\\^o\\^";
    private static final String CRYING_PLACEHOLDER_REGEX = "(\\^o\\^)(\\w|-|$|\\.)+(\\^o\\^)";
    private static final Pattern CRYING_PLACEHOLDER_REGEX_PATTERN = Pattern.compile(CRYING_PLACEHOLDER_REGEX);
    private static final List<String> UNIT_SYMBOLS = Arrays.asList("%", "G", "g", "M", "m", "K", "k", "B", "b", "Ki", "Mi", "Gi");
    private static final Gson GSON = new Gson();
    /**
     * Regularly verifying whether a string is a combination of numbers and units
     */
    private static final String DOUBLE_AND_UNIT_CHECK_REGEX = "^[.\\d+" + String.join("", UNIT_SYMBOLS) + "]+$";

    /**
     * private constructor, not allow to create instance.
     */
    private CollectUtil() {
    }

    /**
     * count match keyword number
     *
     * @param content content
     * @param keyword keyword
     * @return match num
     */
    public static int countMatchKeyword(String content, String keyword) {
        if (StringUtils.isAnyEmpty(content, keyword)) {
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
        if (StringUtils.isEmpty(str)) {
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

        if (!str.matches(DOUBLE_AND_UNIT_CHECK_REGEX)) {
            return doubleAndUnit;
        }
        // extract unit from str value, eg: 23.43GB, 33KB, 44.22G
        try {
            // B KB MB GB % ....
            for (String unitSymbol : UNIT_SYMBOLS) {
                int index = str.indexOf(unitSymbol);
                if (index == 0) {
                    Double doubleValue = 0d;
                    String unit = str.trim();
                    doubleAndUnit.setValue(doubleValue);
                    doubleAndUnit.setUnit(unit);
                    return doubleAndUnit;
                }
                if (index > 0) {
                    Double doubleValue = Double.parseDouble(str.substring(0, index));
                    String unit = str.substring(index).trim();
                    doubleAndUnit.setValue(doubleValue);
                    doubleAndUnit.setUnit(unit);
                    return doubleAndUnit;
                }
            }
        } catch (Exception e) {
            log.debug(e.getMessage());
        }
        return null;
    }

    /**
     * get timeout integer
     *
     * @param timeout timeout str
     * @return timeout
     */
    public static int getTimeout(String timeout) {
        return getTimeout(timeout, DEFAULT_TIMEOUT);
    }

    /**
     * get timeout integer or default value
     *
     * @param timeout        timeout str
     * @param defaultTimeout default timeout
     * @return timeout
     */
    public static int getTimeout(String timeout, int defaultTimeout) {
        if (StringUtils.isEmpty(timeout)) {
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
    public static Boolean assertPromRequireField(String aliasField) {
        return CommonConstants.PROM_TIME.equals(aliasField) || CommonConstants.PROM_VALUE.equals(aliasField);
    }

    /**
     * is contains cryPlaceholder ^o^xxx^o^
     *
     * @param jsonElement json element
     * @return return true when contains
     */
    public static boolean containCryPlaceholder(JsonElement jsonElement) {
        String jsonStr = jsonElement.toString();
        return CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(jsonStr).find();
    }

    public static boolean notContainCryPlaceholder(JsonElement jsonElement) {
        return !containCryPlaceholder(jsonElement);
    }

    /**
     * match existed cry placeholder fields ^o^field^o^
     *
     * @param jsonElement json element
     * @return match field str
     */
    public static Set<String> matchCryPlaceholderField(JsonElement jsonElement) {
        String jsonStr = jsonElement.toString();
        return CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(jsonStr).results()
                .map(item -> item.group().replaceAll(CRYING_PLACEHOLDER_REX, ""))
                .collect(Collectors.toSet());
    }

    private static String replaceSpecialCharacterIfNeeded(String value,
                                                          String replacePattern, Matcher matcher,
                                                          Map<String, Configmap> configmap) {
        matcher.reset();
        while (matcher.find()) {
            String group = matcher.group();
            String replaceField = group.replaceAll(replacePattern, "");
            Configmap param = configmap.get(replaceField);
            if (param == null) {
                continue;
            }
            if (param.getValue() != null) {
                value = value.replace(group, (String) param.getValue());
            } else if (group.length() == value.length()) {
                value = null;
                break;
            } else {
                value = value.replace(group, "");
            }
        }
        return value;
    }

    /**
     * replace cry placeholder to metrics
     *
     * @param metricItem metric item
     * @param configmap  configmap
     * @return metrics
     */
    public static Metrics replaceCryPlaceholderToMetrics(Metrics metricItem, Map<String, Configmap> configmap) {
        JsonElement metricJson = GSON.toJsonTree(metricItem);
        CollectUtil.replaceCryPlaceholder(metricJson, configmap);
        return GSON.fromJson(metricJson, Metrics.class);
    }

    /**
     * json parameter replacement
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
                if (!element.isJsonPrimitive()) {
                    jsonObject.add(entry.getKey(), replaceCryPlaceholder(entry.getValue(), configmap));
                    continue;
                }
                // Replace normal VALUE value
                // Check if there are special characters Replace
                String value = element.getAsString();
                Matcher cryingMatcher = CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                if (!cryingMatcher.find()) {
                    continue;
                }
                // Replace special characters
                value = replaceSpecialCharacterIfNeeded(value, CRYING_PLACEHOLDER_REX, cryingMatcher, configmap);
                jsonObject.addProperty(entry.getKey(), value);
            }
        } else if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            Iterator<JsonElement> iterator = jsonArray.iterator();
            int index = 0;
            while (iterator.hasNext()) {
                JsonElement element = iterator.next();

                if (!element.isJsonPrimitive()) {
                    jsonArray.set(index, replaceCryPlaceholder(element, configmap));
                    index++;
                    continue;
                }
                // Check if there are special characters Replace
                String value = element.getAsString();
                Matcher cryingMatcher = CRYING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                if (!cryingMatcher.find()) {
                    index++;
                    continue;
                }
                // Replace special characters
                value = replaceSpecialCharacterIfNeeded(value, CRYING_PLACEHOLDER_REX, cryingMatcher, configmap);
                jsonArray.set(index, value == null ? JsonNull.INSTANCE : new JsonPrimitive(value));
                index++;
            }
        }
        return jsonElement;
    }

    /**
     * json parameter replacement
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
                if (key != null && key.startsWith(SMILING_PLACEHOLDER) && key.endsWith(SMILING_PLACEHOLDER)) {
                    key = key.replaceAll(SMILING_PLACEHOLDER_REX, "");
                    Configmap param = configmap.get(key);
                    if (param != null && param.getType() == CommonConstants.PARAM_TYPE_MAP) {
                        String jsonValue = (String) param.getValue();
                        TypeReference<Map<String, String>> typeReference = new TypeReference<>() {
                        };
                        Map<String, String> map = JsonUtil.fromJson(jsonValue, typeReference);
                        if (map != null) {
                            map.forEach((name, value) -> {
                                if (!StringUtils.isEmpty(name)) {
                                    jsonObject.addProperty(name, value);
                                }
                            });
                        }
                    }
                    iterator.remove();
                    continue;
                }
                // Replace normal VALUE value
                if (!element.isJsonPrimitive()) {
                    jsonObject.add(entry.getKey(), replaceSmilingPlaceholder(entry.getValue(), configmap));
                    continue;
                }
                // Check if there are special characters Replace
                String value = element.getAsString();
                Matcher smilingMatcher = SMILING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                if (!smilingMatcher.find()) {
                    continue;
                }
                // Replace special characters
                value = replaceSpecialCharacterIfNeeded(value, SMILING_PLACEHOLDER_REX, smilingMatcher, configmap);
                jsonObject.addProperty(entry.getKey(), value);
            }
        } else if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            int index = 0;
            while (index < jsonArray.size()) {
                JsonElement element = jsonArray.get(index);
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    String value = element.getAsString();
                    Matcher smilingMatcher = SMILING_PLACEHOLDER_REGEX_PATTERN.matcher(value);
                    if (smilingMatcher.find()) {
                        smilingMatcher.reset();
                        String[] arrayValues = null;
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
                                } else if (param.getType() == CommonConstants.PARAM_TYPE_ARRAY) {
                                    arrayValues = String.valueOf(param.getValue()).split(",");
                                } else {
                                    value = value.replace(group, (String) param.getValue());
                                }
                            } else {
                                value = null;
                                break;
                            }
                        }
                        if (arrayValues != null) {
                            jsonArray.remove(index);
                            index--;
                            for (String arrayValue : arrayValues) {
                                jsonArray.add(arrayValue);
                                index++;
                            }
                        } else {
                            jsonArray.set(index, value == null ? JsonNull.INSTANCE : new JsonPrimitive(value));
                        }
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

    public static List<Map<String, Configmap>> getConfigmapFromPreCollectData(CollectRep.MetricsData metricsData) {
        if (metricsData.getValuesCount() <= 0 || metricsData.getFieldsCount() <= 0) {
            return new LinkedList<>();
        }
        List<Map<String, Configmap>> mapList = new LinkedList<>();
        for (CollectRep.ValueRow valueRow : metricsData.getValues()) {
            if (valueRow.getColumnsCount() != metricsData.getFieldsCount()) {
                continue;
            }
            Map<String, Configmap> configmapMap = new HashMap<>(valueRow.getColumnsCount());
            int index = 0;
            for (CollectRep.Field field : metricsData.getFields()) {
                String value = valueRow.getColumns(index);
                index++;
                Configmap configmap = new Configmap(field.getName(), value, Integer.valueOf(field.getType()).byteValue());
                configmapMap.put(field.getName(), configmap);
            }
            mapList.add(configmapMap);
        }
        return mapList;
    }

    public static void replaceFieldsForPushStyleMonitor(Metrics metrics, Map<String, Configmap> configmap) {

        List<Metrics.Field> pushFieldList = JsonUtil.fromJson((String) configmap.get("fields").getValue(), new TypeReference<>() {
        });
        metrics.setFields(pushFieldList);
    }

    /**
     * convert 16 hexString to byte[]
     * eg: 302c0201010409636f6d6d756e697479a11c020419e502e7020100020100300e300c06082b060102010102000500
     * Hexadecimal strings are case-insensitive, and the returned arrays are the same
     * @param hexString 16 hexString
     * @return byte[]
     */
    public static byte[] fromHexString(String hexString) {
        if (StringUtils.isEmpty(hexString)) {
            return null;
        }
        byte[] bytes = new byte[hexString.length() / HEX_STR_WIDTH];
        String hex;
        for (int i = 0; i < hexString.length() / HEX_STR_WIDTH; i++) {
            hex = hexString.substring(i * HEX_STR_WIDTH, i * HEX_STR_WIDTH + HEX_STR_WIDTH);
            bytes[i] = (byte) Integer.parseInt(hex, 16);
        }
        return bytes;
    }

    /**
     * convert original string to UTF-7 String
     *
     * @param original original text
     * @param charset  encode charset
     * @return String
     */
    public static String stringEncodeUtf7String(String original, String charset) {
        return new String(original.getBytes(new CharsetProvider().charsetForName(charset)), StandardCharsets.US_ASCII);
    }

    /**
     * convert UTF-7 string to original String
     *
     * @param encoded encoded String
     * @param charset encode charset
     * @return String
     */
    public static String utf7StringDecodeString(String encoded, String charset) {
        return new String(encoded.getBytes(StandardCharsets.US_ASCII), new CharsetProvider().charsetForName(charset));
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
}
