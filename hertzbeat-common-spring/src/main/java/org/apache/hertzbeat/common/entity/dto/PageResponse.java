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

package org.apache.hertzbeat.common.entity.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Stable page response exposed at controller boundaries.
 *
 * @param content page content
 * @param totalElements total matching elements
 * @param pageIndex zero-based page index
 * @param pageSize requested page size
 * @param <T> content type
 */
public record PageResponse<T>(List<T> content, long totalElements, int pageIndex, int pageSize) {

    public PageResponse {
        content = content == null ? List.of() : List.copyOf(content);
    }

    /**
     * Create a stable response from an internal Spring Data page.
     *
     * @param page internal page
     * @param <T> content type
     * @return stable page response
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getTotalElements(), page.getNumber(), page.getSize());
    }
}
