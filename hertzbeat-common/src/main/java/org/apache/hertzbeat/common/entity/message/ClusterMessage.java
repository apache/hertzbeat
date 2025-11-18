/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.entity.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * cluster message entity for fury serialization
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ClusterMessage implements Serializable {

    /**
     * collector identity
     */
    private String identity;

    /**
     * message direction
     */
    private Direction direction;

    /**
     * message type
     */
    private MessageType type;

    /**
     * message content
     * Using String here because most payloads are JSON strings in HertzBeat.
     * Fury handles String efficiently.
     */
    private String msg;

    /**
     * Message Type Enum
     */
    public enum MessageType {
        // heartbeat message
        HEARTBEAT,
        // collector go online to master message
        GO_ONLINE,
        // collector go offline to master message
        GO_OFFLINE,
        // collector go close to master
        GO_CLOSE,
        // issue cyclic collect task
        ISSUE_CYCLIC_TASK,
        // delete cyclic collect task
        DELETE_CYCLIC_TASK,
        // issue one-time collect task
        ISSUE_ONE_TIME_TASK,
        // response one-time collect data
        RESPONSE_ONE_TIME_TASK_DATA,
        // response cyclic collect data
        RESPONSE_CYCLIC_TASK_DATA,
        // response cyclic service discovery data
        RESPONSE_CYCLIC_TASK_SD_DATA
    }

    /**
     * Direction Enum
     */
    public enum Direction {
        // request message
        REQUEST,
        // request response
        RESPONSE
    }
}