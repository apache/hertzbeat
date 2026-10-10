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

package org.apache.hertzbeat.manager.maintenance;

/** Stable, secret-free control-plane maintenance failure classifications. */
public enum MetadataMaintenanceErrorCode {
    INVALID_REQUEST("invalid_request"),
    OPERATION_CONFLICT("operation_conflict"),
    QUIESCE_TIMEOUT("quiesce_timeout"),
    QUIESCE_INTERRUPTED("quiesce_interrupted"),
    PARTICIPANT_FAILURE("participant_failure"),
    RESUME_FAILURE("resume_failure"),
    STALE_LEASE("stale_lease");

    private final String wireCode;

    MetadataMaintenanceErrorCode(String wireCode) {
        this.wireCode = wireCode;
    }

    public String wireCode() {
        return wireCode;
    }
}
