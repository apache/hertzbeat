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

package org.apache.hertzbeat.manager.service.helper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.service.importtask.InvalidImportContentException;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;

/**
 * Parses an uploaded monitor YAML export into bounded map records.
 */
public final class MonitorYamlImportParser {

    public static final String INVALID_CONTENT_MESSAGE = InvalidImportContentException.YAML_MESSAGE;

    private static final int MAX_CONTENT_LENGTH = 3 * 1024 * 1024;
    private static final int MAX_MONITOR_RECORDS = 100;
    private static final int MAX_NESTING_DEPTH = 50;
    private static final int MAX_ALIASES_FOR_COLLECTIONS = 50;

    private MonitorYamlImportParser() {
    }

    /**
     * Parse the single-sequence format written by the monitor YAML exporter.
     *
     * @param inputStream uploaded YAML content
     * @return bounded monitor records, or an empty list for an empty document
     */
    public static List<Map<String, Object>> parse(InputStream inputStream) {
        try {
            Object document = newYamlParser().load(inputStream);
            if (document == null) {
                return List.of();
            }
            if (!(document instanceof List<?> records) || records.size() > MAX_MONITOR_RECORDS) {
                throw invalidContent();
            }
            List<Map<String, Object>> result = new ArrayList<>(records.size());
            for (Object record : records) {
                result.add(toStringKeyMap(record));
            }
            return result;
        } catch (YAMLException exception) {
            // Do not retain or propagate the parser cause because its message may echo uploaded content.
            throw invalidContent();
        }
    }

    private static Yaml newYamlParser() {
        LoaderOptions loaderOptions = new LoaderOptions();
        loaderOptions.setCodePointLimit(MAX_CONTENT_LENGTH);
        loaderOptions.setNestingDepthLimit(MAX_NESTING_DEPTH);
        loaderOptions.setMaxAliasesForCollections(MAX_ALIASES_FOR_COLLECTIONS);
        return new Yaml(new SafeConstructor(loaderOptions));
    }

    private static Map<String, Object> toStringKeyMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            throw invalidContent();
        }
        Map<String, Object> record = new LinkedHashMap<>(rawMap.size());
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (!(entry.getKey() instanceof String key)) {
                throw invalidContent();
            }
            record.put(key, entry.getValue());
        }
        return record;
    }

    private static InvalidImportContentException invalidContent() {
        return InvalidImportContentException.forYaml();
    }
}
