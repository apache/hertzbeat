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

package org.apache.hertzbeat.observability.shared.query;

import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.springframework.util.StringUtils;

/**
 * Applies the public Collector query context to the storage-neutral resource filter language.
 */
public final class CollectorResourceScope {

    private static final String COLLECTOR_ID_PATTERN = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}";

    private CollectorResourceScope() {
    }

    public static String apply(String resourceFilter, String collectorId) {
        String normalizedFilter = StringUtils.trimWhitespace(resourceFilter);
        String normalizedCollectorId = StringUtils.trimWhitespace(collectorId);
        if (!StringUtils.hasText(normalizedCollectorId)) {
            return normalizedFilter;
        }
        if (!normalizedCollectorId.matches(COLLECTOR_ID_PATTERN)) {
            throw new IllegalArgumentException("Collector ID contains unsupported characters");
        }
        if (StringUtils.hasText(normalizedFilter)
                && normalizedFilter.contains(OtlpResourceSemanticAttributes.HERTZBEAT_COLLECTOR_ID)) {
            throw new IllegalArgumentException("Collector ID must use the dedicated query parameter");
        }
        String collectorFilter = OtlpResourceSemanticAttributes.HERTZBEAT_COLLECTOR_ID
                + "=\"" + normalizedCollectorId + "\"";
        return StringUtils.hasText(normalizedFilter)
                ? normalizedFilter + " and " + collectorFilter
                : collectorFilter;
    }
}
