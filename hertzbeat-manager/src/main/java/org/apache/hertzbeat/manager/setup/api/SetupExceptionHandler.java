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

package org.apache.hertzbeat.manager.setup.api;

import java.time.Clock;
import java.util.Objects;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.security.SetupUnlockRejected;
import org.apache.hertzbeat.manager.setup.workflow.SetupWorkflowConflict;
import org.apache.hertzbeat.manager.support.MetadataWriteMaintenanceErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Owns safe HTTP classification for setup failures. */
@RestControllerAdvice(assignableTypes = {SetupController.class, DeploymentController.class})
public class SetupExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SetupExceptionHandler.class);

    private final Clock clock;
    private final SetupFailureDiagnosticSink diagnosticSink;

    public SetupExceptionHandler() {
        this(Clock.systemUTC(), SetupExceptionHandler::logUnexpectedFailure);
    }

    SetupExceptionHandler(Clock clock) {
        this(clock, SetupExceptionHandler::logUnexpectedFailure);
    }

    SetupExceptionHandler(Clock clock, SetupFailureDiagnosticSink diagnosticSink) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.diagnosticSink = Objects.requireNonNull(diagnosticSink, "diagnosticSink");
    }

    @ExceptionHandler(SetupApiException.class)
    public ResponseEntity<SetupErrorResponse> apiFailure(SetupApiException failure) {
        return response(failure.status(), failure.errorCode());
    }

    @ExceptionHandler(SetupWorkflowConflict.class)
    public ResponseEntity<SetupErrorResponse> workflowConflict(SetupWorkflowConflict ignored) {
        return response(HttpStatus.CONFLICT, SetupErrorCode.OPERATION_CONFLICT);
    }

    @ExceptionHandler(SetupUnlockRejected.class)
    public ResponseEntity<SetupErrorResponse> unlockRejected(SetupUnlockRejected failure) {
        return switch (failure.reason()) {
            case INVALID -> response(HttpStatus.FORBIDDEN, SetupErrorCode.SETUP_CODE_INVALID);
            case EXPIRED -> response(HttpStatus.FORBIDDEN, SetupErrorCode.SETUP_CODE_EXPIRED);
            case RATE_LIMITED -> response(HttpStatus.TOO_MANY_REQUESTS, SetupErrorCode.SETUP_RATE_LIMITED);
        };
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<SetupErrorResponse> invalidRequest(Exception ignored) {
        return response(HttpStatus.BAD_REQUEST, SetupErrorCode.INVALID_REQUEST);
    }

    /** Return the same safe maintenance contract used by ordinary manager endpoints. */
    @ExceptionHandler(MetadataWriteAdmissionException.class)
    public ResponseEntity<MetadataWriteMaintenanceErrorResponse> metadataWriteAdmission(
            MetadataWriteAdmissionException failure) {
        return MetadataWriteMaintenanceErrorResponse.httpResponse(failure);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<SetupErrorResponse> unexpectedFailure(Exception failure) {
        reportSafely(failure.getClass().getName());
        return response(HttpStatus.INTERNAL_SERVER_ERROR, SetupErrorCode.INTERNAL_ERROR);
    }

    private static void logUnexpectedFailure(String exceptionClass) {
        LOGGER.error("Unexpected setup request failure exception={}", exceptionClass);
    }

    private void reportSafely(String exceptionClass) {
        try {
            diagnosticSink.report(exceptionClass);
        } catch (RuntimeException ignored) {
            // Diagnostics must never replace the stable HTTP failure response.
        }
    }

    private ResponseEntity<SetupErrorResponse> response(HttpStatus status, SetupErrorCode code) {
        return ResponseEntity.status(status).header("Cache-Control", "no-store")
                .body(new SetupErrorResponse(code, clock.instant()));
    }
}
