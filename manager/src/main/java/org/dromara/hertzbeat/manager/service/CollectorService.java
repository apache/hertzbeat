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

package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

/**
 * collector service
 * @author tom
 */
public interface CollectorService {
    
    /**
     * Dynamic conditional query
     *
     * @param specification Query conditions
     * @param pageRequest pageIndex pageSize
     * @return Search result
     */
    Page<CollectorSummary> getCollectors(Specification<Collector> specification, PageRequest pageRequest);
    
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
}
