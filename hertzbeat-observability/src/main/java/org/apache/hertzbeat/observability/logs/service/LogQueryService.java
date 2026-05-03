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

package org.apache.hertzbeat.observability.logs.service;

import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.data.domain.Page;

/**
 * Log query application service.
 */
public interface LogQueryService {

    Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search,
                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise);

    Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                      Integer severityNumber, String severityText, String search,
                                      boolean hideInternal, boolean hideNoise);

    Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           boolean hideInternal, boolean hideNoise);

    Map<String, Object> trendStats(Long start, Long end, String traceId, String spanId,
                                   Integer severityNumber, String severityText, String search,
                                   boolean hideInternal, boolean hideNoise);
}
