/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.AlertSilenceNotFoundException;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Safe and non-reflective failure mapping for the two existing alert-silence controllers. */
@Slf4j
@RestControllerAdvice(assignableTypes = {AlertSilenceController.class, AlertSilencesController.class})
public class AlertSilenceControllerAdvice {

    @ExceptionHandler(AlertSilenceNotFoundException.class)
    public ResponseEntity<Message<Void>> missing() {
        return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "AlertSilence not exist."));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Message<Void>> unavailable(DataAccessException exception) {
        log.error("Alert silence storage unavailable: {}", exception.getClass().getSimpleName());
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "Alert silence storage unavailable"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Message<Void>> invalid() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(FAIL_CODE, "Invalid alert silence request"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<Message<Void>> malformed() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(FAIL_CODE, "Invalid alert silence request"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Message<Void>> error(Exception exception) {
        log.error("Alert silence operation error: {}", exception.getClass().getSimpleName());
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "Alert silence operation error"));
    }
}
