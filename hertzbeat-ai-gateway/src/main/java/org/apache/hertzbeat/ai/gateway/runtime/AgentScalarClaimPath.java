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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.List;
import java.util.Map;

/** Bounded JSON Pointer traversal into already verified, redacted READ results only. */
final class AgentScalarClaimPath {
    private static final java.util.regex.Pattern INVALID_ESCAPE =
            java.util.regex.Pattern.compile("~[^01]|~$");

    private AgentScalarClaimPath() {}

    static boolean matches(Map<String, Object> values, String path, String expected) {
        if (path == null || path.length() > 512 || !path.startsWith("result/") || expected == null)
            return false;
        String[] segments = path.split("/", -1);
        if (segments.length > 12) return false;
        Object value = values;
        for (String segment : segments) {
            if (INVALID_ESCAPE.matcher(segment).find()) return false;
            String key = segment.replace("~1", "/").replace("~0", "~");
            if (value instanceof Map<?, ?> map) {
                if (!map.containsKey(key)) return false;
                value = map.get(key);
            } else if (value instanceof List<?> list) {
                if (!key.matches("0|[1-9][0-9]{0,3}")) return false;
                int index = Integer.parseInt(key);
                if (index >= list.size()) return false;
                value = list.get(index);
            } else return false;
        }
        return (value instanceof String || value instanceof Number || value instanceof Boolean)
                && expected.equals(String.valueOf(value));
    }
}
