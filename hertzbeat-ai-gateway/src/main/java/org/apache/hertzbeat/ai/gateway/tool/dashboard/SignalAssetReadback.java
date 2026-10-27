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

package org.apache.hertzbeat.ai.gateway.tool.dashboard;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/** Exact post-write observation through the existing shared native listing service. */
public final class SignalAssetReadback {
    private SignalAssetReadback() {}

    public static <T> T saved(T acknowledgment, List<T> observed, Predicate<T> target) {
        check(observed);
        var matches = observed.stream().filter(target).toList();
        if (acknowledgment == null
                || matches.size() != 1
                || !hash(acknowledgment).equals(hash(matches.getFirst())))
            throw new IllegalStateException("SHARED_ASSET_WRITE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return matches.getFirst();
    }

    public static <T> void absent(List<T> observed, Predicate<T> target) {
        check(observed);
        if (observed.stream().anyMatch(target))
            throw new IllegalStateException("SHARED_ASSET_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
    }

    private static void check(List<?> observed) {
        // Existing service loads all shared assets; this caps verification/projection, not DB
        // source loading.
        if (observed == null || observed.size() > 1000)
            throw new IllegalStateException("SHARED_ASSET_READBACK_SCOPE_EXCEEDED_DO_NOT_RETRY");
    }

    private static String hash(Object value) {
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        var fields = new LinkedHashMap<>(row);
        fields.remove("createTime");
        fields.remove("updateTime");
        fields.remove("creator");
        return AgentToolPayloadHasher.normalizedArgumentsHash(fields);
    }
}
