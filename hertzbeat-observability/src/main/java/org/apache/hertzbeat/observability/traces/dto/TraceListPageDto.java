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

package org.apache.hertzbeat.observability.traces.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** Adds ordering and coverage evidence while preserving the existing Spring Page response. */
public final class TraceListPageDto extends PageImpl<TraceListItemDto> {

    private final Query query;

    public TraceListPageDto(List<TraceListItemDto> content, Pageable pageable, long total, Query query) {
        super(content, pageable, total);
        this.query = query;
    }

    public Query getQuery() {
        return query;
    }

    /** Describes the evaluated query scope; a bounded total is not a whole-window trace count. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Query(String sort, String coverage, Integer rowLimit, Boolean truncated) {
    }
}
