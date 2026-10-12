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

package org.apache.hertzbeat.common.observability.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import tools.jackson.databind.JsonNode;

/**
 * Minimal entity context shared by observability flows.
 */
@Getter
@AllArgsConstructor
public class ObservedEntityContext {

    private final ObserveEntity entity;
    private final List<EntityIdentity> identities;
    private final JsonNode hertzbeat;

    public static ObservedEntityContext from(ObserveEntity entity, List<EntityIdentity> identities) {
        return new ObservedEntityContext(entity, identities, null);
    }

    public static ObservedEntityContext from(ObserveEntity entity, List<EntityIdentity> identities, JsonNode hertzbeat) {
        return new ObservedEntityContext(entity, identities, hertzbeat == null ? null : hertzbeat.deepCopy());
    }
}
