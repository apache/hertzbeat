/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
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

package org.apache.hertzbeat.manager.pojo.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Reusable catalog suggestions derived from existing entities.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntityCatalogSuggestionsInfo {

    private List<String> owners;

    private List<String> namespaces;

    private List<String> environments;

    private List<String> systems;

    private List<String> lifecycles;

    private List<String> tiers;

    private List<String> inheritFromRefs;

    private List<String> entityRefs;

    private List<String> languages;

    private List<String> linkProviders;
}
