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

package org.apache.hertzbeat.ai.agent.dao;

import org.apache.hertzbeat.ai.agent.entity.OpenAiConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * OpenAI Agent Configuration Dao
 */
@Repository
public interface OpenAiConfigDao extends JpaRepository<OpenAiConfig, String>, JpaSpecificationExecutor<OpenAiConfig> {
    
    /**
     * Query by type
     * @param type type
     * @return Return the queried configuration information
     */
    OpenAiConfig findByType(String type);
}