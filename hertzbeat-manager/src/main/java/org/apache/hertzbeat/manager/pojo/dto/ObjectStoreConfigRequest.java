/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Data;

/** Typed object-store write contract. Omitted OBS credentials preserve stored values. */
@Data
public class ObjectStoreConfigRequest {

    private String type;
    private ObjectStoreConfigOptions config = new ObjectStoreConfigOptions();
    private Set<String> clearSecrets = new LinkedHashSet<>();

    @JsonIgnore
    private boolean unknownFieldPresent;

    @JsonAnySetter
    public void markUnknownField(String name, Object value) {
        unknownFieldPresent = true;
    }
}
