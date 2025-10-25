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

/**
 * Interface defining operations for managing collector.
 * Implementations of this interface provide functionality to control the operation state
 * of collectors in the system.
 */
public interface CollectorOperation {

    /**
     * Takes a collector offline by stopping its collection operations.
     * This is typically used for maintenance, updates, or when the collector is no longer needed.
     *
     * @param identity The unique identifier of the collector to be taken offline
     * @return true if the collector was successfully taken offline,
     *         false if the operation failed or the collector wasn't found
     */
    boolean offlineCollector(String identity);

    /**
     * Brings a collector online by starting its collection operations.
     * This is used to activate a collector that was previously offline.
     *
     * @param identity The unique identifier of the collector to be brought online
     * @return true if the collector was successfully brought online,
     *         false if the operation failed or the collector wasn't found
     */
    boolean onlineCollector(String identity);
}
