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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Topology scope and selection selected by an operator.
 */
@Data
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor
public class AgentTopologyRef {

    @Positive
    private Long rootEntityId;

    @Size(max = 512)
    private String nodeId;

    @Size(max = 512)
    private String edgeId;

    @Min(1)
    @Max(2)
    private Integer depth;

    @Size(max = 128)
    private String environment;

    @Size(max = 64)
    private String sourceKind;

    @Positive
    private Long start;

    @Positive
    private Long end;

    @Size(max = 128)
    private String relationType;

    private Boolean hideInternal;

    @PositiveOrZero
    @Max(10_000)
    private Integer pageIndex;

    @Min(1)
    @Max(100)
    private Integer pageSize;

    @AssertTrue
    @JsonIgnore
    public boolean isSingleSelectionValid() {
        return nodeId == null || edgeId == null;
    }

    @AssertTrue
    @JsonIgnore
    public boolean isTimeWindowValid() {
        return start == null && end == null || start != null && end != null && start < end;
    }
}
