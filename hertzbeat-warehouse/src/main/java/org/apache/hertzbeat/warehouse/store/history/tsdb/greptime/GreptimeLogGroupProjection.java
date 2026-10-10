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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.stream.Collectors;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;

/** Shared raw group projection for aggregate identity and exact selected membership. */
final class GreptimeLogGroupProjection {
    private GreptimeLogGroupProjection() { }

    static String kind(LogFacets.Field field, String expression) {
        if (field == null) { return "'all'"; }
        if ("builtin".equals(field.source())) { return "CASE WHEN " + expression + " IS NULL THEN 'missing' ELSE 'value' END"; }
        String column = "resource".equals(field.source()) ? "resource_attributes" : "log_attributes";
        String path = "'$[\"" + field.key() + "\"]'";
        return "CASE WHEN NOT COALESCE(json_path_exists(" + column + ", " + path + "), false) THEN 'missing'"
                + " WHEN COALESCE(json_path_match(" + column + ", '$[\"" + field.key() + "\"] == null'), false) THEN 'null'"
                + " WHEN " + expression + " IS NULL THEN 'non_scalar' ELSE 'value' END";
    }

    static String selection(LogGroupSelection selection) {
        return selection.groups().stream().map(key -> {
            String expression = GreptimeLogFacets.expression(key.field());
            String condition = kind(key.field(), expression) + " = '" + key.kind() + "'";
            if ("value".equals(key.kind())) { condition += " AND " + expression + " = '" + key.value().replace("'", "''") + "'"; }
            return "COALESCE((" + condition + "), false)";
        }).collect(Collectors.joining(" AND ", "(", ")"));
    }
}
