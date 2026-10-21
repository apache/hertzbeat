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

package org.apache.hertzbeat.common.entity.metric;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Physical Greptime tag names owned by HertzBeat for native metric samples.
 */
public final class NativeMetricSystemDimensions {

    public static final String WORKSPACE_ID = "hertzbeat_workspace_id";
    public static final String ENTITY_ID = "hertzbeat_entity_id";
    public static final String ENTITY_TYPE = "hertzbeat_entity_type";
    public static final String MONITOR_ID = "hertzbeat_monitor_id";
    public static final String COLLECTOR_ID = "hertzbeat_collector_id";
    public static final String INSTANCE = "instance";
    public static final String TIMESTAMP = "ts";

    public static final List<String> TAG_NAMES = List.of(
            WORKSPACE_ID, ENTITY_ID, ENTITY_TYPE, MONITOR_ID, COLLECTOR_ID, INSTANCE);

    private static final Set<String> RESERVED_NAMES = Set.of(
            WORKSPACE_ID, ENTITY_ID, ENTITY_TYPE, MONITOR_ID, COLLECTOR_ID, INSTANCE, TIMESTAMP);

    private NativeMetricSystemDimensions() {
    }

    /**
     * Whether a Collector field name would collide with a HertzBeat-owned metric column.
     *
     * @param fieldName Collector field name
     * @return true when the field must not be projected as an application column
     */
    public static boolean isReserved(String fieldName) {
        return fieldName != null && RESERVED_NAMES.contains(fieldName.trim().toLowerCase(Locale.ROOT));
    }
}
