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

package org.apache.hertzbeat.manager.service;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.CollectorSummary;
import org.springframework.data.domain.Page;

/**
 * collector service
 */
public interface CollectorService {
    
    /**
     * Dynamic conditional query
     * @param name Collector Name
     * @param pageIndex current pageIndex
     * @param pageSize Number of list pagination
     *
     * @return Search result
     */
    Page<CollectorSummary> getCollectors(String name, int pageIndex, Integer pageSize);
    
    /**
     * delete registered collectors
     * @param collectors collector
     */
    void deleteRegisteredCollector(List<String> collectors);

    /**
     * is has the collector name
     * @param collector collector name
     * @return return true if it has
     */
    boolean hasCollector(String collector);

    /**
     * Generate Collector Deploy Info
     * @param collector collector name
     */
    Map<String, String> generateCollectorDeployInfo(String collector);

    /**
     * Makes Collectors Offline
     * @param collectors collector names
     */
    void makeCollectorsOffline(List<String> collectors);

    /**
     * Makes Collectors Online
     * @param collectors collector names
     */
    void makeCollectorsOnline(List<String> collectors);

}
