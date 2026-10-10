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

package org.apache.hertzbeat.common.observability.dto.trace;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;

/**
 * Trace span node payload.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TraceSpanNodeDto {

    private String traceId;

    private String spanId;

    private String parentSpanId;

    private String spanName;

    private String serviceName;

    private String status;

    private String spanKind;

    private String statusMessage;

    private String traceState;

    private String scopeName;

    private String scopeVersion;

    private Long durationNanos;

    private Long startTime;

    private boolean highlighted;

    private Map<String, String> resourceAttributes;

    private Map<String, String> spanAttributes;

    private List<TraceSpanEventDto> events;

    private List<TraceSpanLinkDto> links;

    private CodeNavigationHint codeNavigationHint;
}
