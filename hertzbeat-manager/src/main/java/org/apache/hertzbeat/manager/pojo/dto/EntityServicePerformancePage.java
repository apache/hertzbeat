/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
