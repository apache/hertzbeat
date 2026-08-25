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

package org.apache.hertzbeat.ai.gateway.contract;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Exact Trace Explore detail scope selected by an operator. */
@Data
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor
public class AgentTraceRef {

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")
    private String traceId;

    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")
    private String spanId;

    @Positive
    private Long start;

    @Positive
    private Long end;

    @Size(max = 512)
    private String serviceName;

    @Size(max = 512)
    private String serviceNamespace;

    @Size(max = 512)
    private String environment;

    @Size(max = 2048)
    private String resourceFilter;

    @Size(max = 2048)
    private String attributeFilter;

    @PositiveOrZero
    private Long minDurationMs;

    @PositiveOrZero
    private Long maxDurationMs;

    @AssertTrue
    @JsonIgnore
    public boolean isTimeWindowValid() {
        return start != null && end != null && start < end;
    }

    @AssertTrue
    @JsonIgnore
    public boolean isDurationRangeValid() {
        return minDurationMs == null || maxDurationMs == null || minDurationMs <= maxDurationMs;
    }
}
