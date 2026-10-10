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

/** Safe admission failure that never exposes operation identifiers or persistence details. */
public final class MetadataWriteAdmissionException extends RuntimeException {

    private static final String MAINTENANCE_MESSAGE = "Metadata writes are temporarily unavailable";
    private static final String CONFLICT_MESSAGE = "Metadata maintenance operation is already active";
    private static final String TIMEOUT_MESSAGE = "Metadata write drain timed out";
    private static final String INTERRUPTED_MESSAGE = "Metadata write drain was interrupted";
    private static final String INVALID_MESSAGE = "Metadata maintenance request is invalid";

    private final MetadataWriteAdmissionErrorCode code;

    private MetadataWriteAdmissionException(MetadataWriteAdmissionErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    /** Return the stable machine-readable classification. */
    public MetadataWriteAdmissionErrorCode code() {
        return code;
    }

    /** Return the stable, secret-free message suitable for typed transport boundaries. */
    public String safeMessage() {
        return getMessage();
    }

    /** Create the stable rejection used by typed metadata-write callers and tests. */
    public static MetadataWriteAdmissionException metadataWritesPaused() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.MAINTENANCE_ACTIVE, MAINTENANCE_MESSAGE);
    }

    static MetadataWriteAdmissionException operationConflict() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.OPERATION_CONFLICT, CONFLICT_MESSAGE);
    }

    static MetadataWriteAdmissionException drainTimeout() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.DRAIN_TIMEOUT, TIMEOUT_MESSAGE);
    }

    static MetadataWriteAdmissionException acquisitionInterrupted() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.ACQUISITION_INTERRUPTED, INTERRUPTED_MESSAGE);
    }

    static MetadataWriteAdmissionException invalidRequest() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.INVALID_REQUEST, INVALID_MESSAGE);
    }
}
