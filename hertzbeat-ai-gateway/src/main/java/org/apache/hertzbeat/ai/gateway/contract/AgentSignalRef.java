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
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Signal query and time-window context selected by an operator.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AgentSignalRef {

    @NotBlank
    @Pattern(regexp = "metrics|logs|traces")
    private String type;

    @Size(max = 2048)
    private String query;

    @Size(max = 64)
    private String timeRange;

    @PositiveOrZero
    private Long start;

    @PositiveOrZero
    private Long end;

    /**
     * Absolute windows must be complete and ordered; relative-only windows leave both boundaries absent.
     */
    @AssertTrue
    @JsonIgnore
    public boolean isAbsoluteWindowValid() {
        if (start == null && end == null) {
            return true;
        }
        return start != null && end != null && start <= end;
    }
}
