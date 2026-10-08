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

/** One inclusive native finite Float64 range, separate from textual search and exact group identity. */
public record LogNumericRange(int version, LogFacets.Field field, double min, double max) {
    public LogNumericRange {
        if (version != 1 || field == null || !LogFacets.Field.parse(field.id()).equals(field)
                || "builtin".equals(field.source()) || !Double.isFinite(min) || !Double.isFinite(max) || min > max) {
            throw new IllegalArgumentException("Invalid native numeric range");
        }
        new LogSearchExpression.Field("resource".equals(field.source())
                ? LogSearchExpression.Domain.RESOURCE : LogSearchExpression.Domain.ATTRIBUTE, field.key());
    }
}
