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

package org.apache.hertzbeat.alert.dao;

import org.apache.hertzbeat.common.entity.manager.Collector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/**
 * Alert Collector Dao
 */
public interface AlertCollectorDao extends JpaRepository<Collector, Long>, JpaSpecificationExecutor<Collector> {

    /**
     * Query the collector in the specified state
     * @param status status value
     * @return collector list
     */
    List<Collector> findCollectorsByStatus(Byte status);

    /**
     * Query collector by name
     * @param name collector name
     * @return collector
     */
    Collector findCollectorByName(String name);
}
