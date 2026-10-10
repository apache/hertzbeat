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

package org.apache.hertzbeat.common.transaction;

/** Stable, secret-free failure classifications for metadata write admission. */
public enum MetadataWriteAdmissionErrorCode {
    MAINTENANCE_ACTIVE("metadata_writes_paused"),
    OPERATION_CONFLICT("operation_conflict"),
    DRAIN_TIMEOUT("drain_timeout"),
    ACQUISITION_INTERRUPTED("acquisition_interrupted"),
    INVALID_REQUEST("invalid_request");

    private final String wireCode;

    MetadataWriteAdmissionErrorCode(String wireCode) {
        this.wireCode = wireCode;
    }

    /** Return the stable, safe code exposed at typed transport boundaries. */
    public String wireCode() {
        return wireCode;
    }
}
