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

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Bounded whole-candidate service ranking, distinct from registered entity pagination. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record EntityServicePerformancePage(String state, int candidateLimit, Long totalElements,
                                           int pageIndex, int pageSize, String sort, String order,
                                           EntityApmRedView.Window window, String population, String source,
                                           int resolutionSeconds, List<Row> content) {
    public EntityServicePerformancePage {
        content = List.copyOf(content);
    }

    /** Catalog metadata and canonical RED evidence; missing summaries are never zeros. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Row(EntitySummaryInfo entity, EntityApmRedView.Identity identity,
                      String state, EntityApmRedView.RedSummary summary) {
    }
}
