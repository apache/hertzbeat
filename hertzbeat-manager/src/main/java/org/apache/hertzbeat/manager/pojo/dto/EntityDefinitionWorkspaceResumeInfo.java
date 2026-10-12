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
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Shared definition workspace resume state.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntityDefinitionWorkspaceResumeInfo {

    private String token;

    private String content;

    private String format;

    private String source;

    private Integer count;

    private String ownerDraft;

    private String systemDraft;

    private String runbookDraft;

    private Map<String, String> queryParams;

    private String creator;

    private LocalDateTime updatedAt;
}
