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

package org.apache.hertzbeat.log.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;

import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.support.exception.StorageUnavailableException;
import org.apache.hertzbeat.log.service.SignalQueryRejectedException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;

/** Maps bounded signal workload rejection to a retryable HTTP response. */
@RestControllerAdvice(basePackages = "org.apache.hertzbeat.log.controller")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SignalWorkloadExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Message<Void>> handleInvalidQuery(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Message.fail(FAIL_CODE, exception.getMessage()));
    }

    @ExceptionHandler(SignalQueryRejectedException.class)
    public ResponseEntity<Message<Void>> handleRejected(SignalQueryRejectedException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "1")
                .body(Message.fail(FAIL_CODE, exception.getMessage()));
    }

    @ExceptionHandler(StorageUnavailableException.class)
    public ResponseEntity<Message<Void>> handleStorageUnavailable(StorageUnavailableException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, "1")
                .body(Message.fail(FAIL_CODE, exception.getMessage()));
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<Message<Void>> handleStorageClientFailure(RestClientException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, "1")
                .body(Message.fail(FAIL_CODE, "GreptimeDB storage is unavailable"));
    }
}
