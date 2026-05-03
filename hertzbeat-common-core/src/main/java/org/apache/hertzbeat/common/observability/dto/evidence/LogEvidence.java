/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.observability.dto.evidence;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryBindingResult;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;

/**
 * Unified log evidence view.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LogEvidence {

    private String source;

    private String signal;

    private Long entityId;

    private TelemetryIdentitySnapshot identitySnapshot;

    private Long observedAt;

    private String severityOrHealth;

    private String queryHint;

    private TelemetryBindingResult bindingResult;

    private CodeNavigationHint codeNavigationHint;

    private String body;

    private String severityText;

    private String traceId;

    private String spanId;

    private Map<String, String> resource;

    private List<String> preferredSearchTerms;
}
