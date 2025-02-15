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

package org.apache.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AppCount class
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class AppCount {

    public AppCount(String app, byte status, Long size) {
        this.app = app;
        this.status = status;
        this.size = size;
    }

    /**
     * monitor category
     */
    private String category;

    /**
     * monitor type
     */
    private String app;

    /**
     * task status
     */
    private transient byte status;

    /**
     * monitor count
     */
    private long size;

    /**
     * number of available tasks
     */
    private long availableSize;

    /**
     * number of tasks with unmonitored status
     */
    private long unManageSize;

    /**
     * number of tasks with unavailable status
     */
    private long unAvailableSize;
}
