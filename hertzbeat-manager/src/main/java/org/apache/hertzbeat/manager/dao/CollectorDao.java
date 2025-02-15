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
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;

/**
 * Collector repository
 */
public interface CollectorDao extends JpaRepository<Collector, Long>, JpaSpecificationExecutor<Collector> {
    
    /**
     * find collector by name
     * @param name name
     * @return collector
     */
    Optional<Collector> findCollectorByName(String name);

    /**
     * find collectors by names
     * @param names collector name list
     * @return collector list
     */
    List<Collector> findCollectorsByNameIn(List<String> names);

    /**
     * delete collector by name
     * @param collector collector name
     */
    @Modifying
    void deleteCollectorByName(String collector);
}
