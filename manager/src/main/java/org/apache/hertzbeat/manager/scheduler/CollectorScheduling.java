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

package org.apache.hertzbeat.manager.scheduler;

import org.apache.hertzbeat.common.entity.dto.CollectorInfo;

/**
 * slave collector service
 */
public interface CollectorScheduling {
    
    /**
     * register collector go online
     * @param identity collector identity name
     * @param collectorInfo collector information
     */
    void collectorGoOnline(String identity, CollectorInfo collectorInfo);
    
    /**
     * register collector go offline
     * @param identity collector identity name
     */
    void collectorGoOffline(String identity);
    
    /**
     * reBalance dispatch monitoring jobs when collector go online or offline or timeout
     */
    void reBalanceCollectorAssignJobs();
    
    /**
     * offline collector(stop collector collect operation)
     * @param identity collector identity name
     * @return true/false
     */
    boolean offlineCollector(String identity);

    /**
     * online collector(start collector collect operation)
     * @param identity collector identity name
     * @return true/false
     */
    boolean onlineCollector(String identity);
}
