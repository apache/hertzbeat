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

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;

/**
 * Entity list summary information.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntitySummaryInfo {

    private EntityInfo entity;

    private long identityCount;

    private long monitorCount;

    private long relationCount;

    private int activeAlertCount;

    private EntityStatusInfo status;

    private EntityOpsSummaryInfo opsSummary;

    private EntityNextActionInfo nextAction;

    private Long lastEvidenceAt;

    private boolean definitionManaged;

    private String definitionActivityStatus;

    private String definitionActivitySummary;

    private String definitionActivityFormat;

    private LocalDateTime definitionActivityTime;
}
