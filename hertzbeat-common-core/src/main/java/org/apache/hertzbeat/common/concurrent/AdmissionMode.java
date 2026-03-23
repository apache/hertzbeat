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

package org.apache.hertzbeat.common.concurrent;

/**
 * Task admission mode for managed executors.
 */
public enum AdmissionMode {

    /**
     * Start each task on its own virtual thread without an executor-level concurrency cap.
     */
    UNBOUNDED_VT,

    /**
     * Reject immediately when the configured concurrency cap has been reached.
     */
    LIMIT_AND_REJECT,

    /**
     * Block the submitter until a permit is available.
     */
    LIMIT_AND_BLOCK
}
