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

package org.apache.hertzbeat.observability.ingestion.enricher;

import java.util.UUID;
import org.apache.commons.lang3.StringUtils;

/**
 * Request-scoped HertzBeat correlation values to inject into OTLP records.
 */
public record OtlpCorrelationContext(String ingestId, String entityId, String entityType, String workspaceId) {

    public OtlpCorrelationContext {
        ingestId = StringUtils.trimToNull(ingestId);
        entityId = StringUtils.trimToNull(entityId);
        entityType = StringUtils.trimToNull(entityType);
        workspaceId = StringUtils.trimToNull(workspaceId);
    }

    public OtlpCorrelationContext(String ingestId, String entityId, String workspaceId) {
        this(ingestId, entityId, null, workspaceId);
    }

    public static OtlpCorrelationContext empty() {
        return new OtlpCorrelationContext(null, null, null, null);
    }

    OtlpCorrelationContext withIngestId() {
        if (StringUtils.isNotBlank(ingestId)) {
            return this;
        }
        return new OtlpCorrelationContext(UUID.randomUUID().toString(), entityId, entityType, workspaceId);
    }
}
