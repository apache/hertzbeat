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

package org.apache.hertzbeat.common.observability.dto.binding;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Binding result derived from the canonical telemetry identities of a signal.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TelemetryBindingResult {

    private Long entityId;

    private String entityType;

    private String entityName;

    private boolean bound;

    private String source;

    private int matchedIdentityCount;

    private List<String> matchedIdentityKeys;

    private String primaryIdentityKey;

    private String primaryIdentityValue;
}
