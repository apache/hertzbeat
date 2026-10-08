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

import java.util.List;

/** One explicitly typed raw-event ordering, independent of population filters. */
public record LogSort(int version, String field, String type, String direction) {
    public LogSort {
        if (version != 1 || type == null || direction == null
                || !List.of("number", "text").contains(type) || !List.of("asc", "desc").contains(direction)) {
            throw new IllegalArgumentException("Invalid log sort");
        }
        var parsed = LogFacets.Field.parse(field);
        if ("builtin".equals(parsed.source()) && !"text".equals(type)) {
            throw new IllegalArgumentException("Builtin log sort requires text");
        }
    }
}
