/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.util;


import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.dataformat.xml.XmlMapper;

/**
 * xml util
 */
@Slf4j
public class XmlUtil {

    private static final XmlMapper XML_MAPPER = XmlMapper.builder()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
        .build();

    private XmlUtil() {
    }

    /**
     * Convert object to XML string
     */
    public static String toXml(Object source) {
        if (source == null) {
            return null;
        }
        return XML_MAPPER.writeValueAsString(source);
    }

    /**
     * Convert XML string to object
     */
    public static <T> T fromXml(String xml, Class<T> clazz) {
        if (StringUtils.isEmpty(xml)) {
            return null;
        }
        return XML_MAPPER.readValue(xml, clazz);
    }

    /**
     * Convert XML string to object with TypeReference
     */
    public static <T> T fromXml(String xml, TypeReference<T> type) {
        if (!StringUtils.isEmpty(xml)) {
            return null;
        }
        try {
            return XML_MAPPER.readValue(xml, type);
        } catch (JacksonException e) {
            log.error("Error parsing XML to TypeReference: {}", e.getMessage(), e);
            return null;
        }
    }
}
