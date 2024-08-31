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

package org.apache.hertzbeat.manager.dao;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * PluginParamDao database operations
 */
public interface PluginParamDao extends JpaRepository<PluginParam, Long> {

    /**
     * Query the list of parameters associated with the monitoring ID'
     * @param pluginMetadataId Monitor ID
     * @return list of parameter values
     */
    List<PluginParam> findParamsByPluginMetadataId(Long pluginMetadataId);

    /**
     * Remove the parameter list associated with the pluginMetadata ID based on it
     * @param pluginMetadataId Monitor Id
     */
    void deletePluginParamsByPluginMetadataId(long pluginMetadataId);

    /**
     * Remove the parameter list associated with the pluginMetadata ID list based on it
     * @param pluginMetadataIds Monitoring ID List
     */
    void deletePluginParamsByPluginMetadataIdIn(Set<Long> pluginMetadataIds);
}
