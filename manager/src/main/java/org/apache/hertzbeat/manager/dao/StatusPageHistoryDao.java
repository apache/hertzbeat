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
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * StatusPageOrg DAO interface.
 */
public interface StatusPageHistoryDao extends JpaRepository<StatusPageHistory, Long>, JpaSpecificationExecutor<StatusPageHistory> {

    /**
     * find status page history by timestamp between start and end.
     * @param start start timestamp
     * @param end end timestamp
     * @return status page history list
     */
    List<StatusPageHistory> findStatusPageHistoriesByTimestampBetween(long start, long end);
    
    /**
     * find status page history by component id and timestamp between start and end.
     * @param componentId component id
     * @param start start timestamp
     * @param end end timestamp
     * @return status page history list
     */
    List<StatusPageHistory> findStatusPageHistoriesByComponentIdAndTimestampBetween(long componentId, long start, long end);
}
