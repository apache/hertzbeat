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
 * Interface defining operations for receiving collector status updates from remote collectors.
 * This interface serves as a callback mechanism for handling collector online/offline events.
 */
public interface CollectorOperationReceiver {
    /**
     * Notifies the system when a collector comes online.
     * This method should be called when a collector establishes connection and becomes available.
     *
     * @param identity The unique identifier of the collector (e.g., hostname, IP, or custom ID)
     * @param collectorInfo Detailed information about the collector including capabilities,
     *                      configuration, and status metadata
     */
    void collectorGoOnline(String identity, CollectorInfo collectorInfo);

    /**
     * Notifies the system when a collector goes offline.
     * This method should be called when a collector disconnects or becomes unavailable.
     *
     * @param identity The unique identifier of the collector to be marked as offline
     */
    void collectorGoOffline(String identity);
}
