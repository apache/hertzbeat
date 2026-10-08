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

package org.apache.hertzbeat.common.observability.dto.log;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;

/** Exact group identities, independent of user-authored Boolean search. */
public record LogGroupSelection(int version, List<Key> groups) {
    public LogGroupSelection {
        if (version != 1 || groups == null || groups.isEmpty() || groups.size() > 4 || groups.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("Invalid log group selection");
        }
        groups = List.copyOf(groups);
        var fields = new HashSet<String>();
        for (var key : groups) {
            if (!fields.add(key.field().id())) { throw new IllegalArgumentException("Duplicate selected field"); }
        }
        var external = groups.stream().map(key -> "value".equals(key.kind())
                ? Map.of("field", key.field().id(), "kind", key.kind(), "value", key.value())
                : Map.of("field", key.field().id(), "kind", key.kind())).toList();
        if (JsonUtil.toJson(Map.of("version", version, "groups", external)).length() > 4096) {
            throw new IllegalArgumentException("Log group selection exceeds limit");
        }
    }

    /** A literal field projection identity; non-value kinds never contain text. */
    public record Key(LogFacets.Field field, String kind, String value) {
        public Key {
            if (field == null || kind == null || !List.of("value", "missing", "null", "non_scalar").contains(kind)
                    || ("value".equals(kind) != (value != null)) || (value != null && value.length() > 1024)) {
                throw new IllegalArgumentException("Invalid selected group key");
            }
            var canonical = LogFacets.Field.parse(field.id());
            if (!canonical.equals(field)) { throw new IllegalArgumentException("Inconsistent selected field"); }
        }
    }
}
