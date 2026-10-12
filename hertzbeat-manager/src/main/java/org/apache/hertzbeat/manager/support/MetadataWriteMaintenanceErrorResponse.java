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

package org.apache.hertzbeat.manager.support;

import java.util.Objects;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Stable, secret-free response for temporarily unavailable metadata writes. */
public record MetadataWriteMaintenanceErrorResponse(String errorCode, String message) {

    /** Map every shared category to stable HTTP semantics without exposing private state. */
    public static ResponseEntity<MetadataWriteMaintenanceErrorResponse> httpResponse(
            MetadataWriteAdmissionException failure) {
        Objects.requireNonNull(failure, "failure");
        HttpStatus status = switch (failure.code()) {
            case MAINTENANCE_ACTIVE, DRAIN_TIMEOUT, ACQUISITION_INTERRUPTED ->
                    HttpStatus.SERVICE_UNAVAILABLE;
            case OPERATION_CONFLICT -> HttpStatus.CONFLICT;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
        };
        MetadataWriteMaintenanceErrorResponse body = new MetadataWriteMaintenanceErrorResponse(
                failure.code().wireCode(), failure.safeMessage());
        return ResponseEntity.status(status).header("Cache-Control", "no-store").body(body);
    }
}
