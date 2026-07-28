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

package org.apache.hertzbeat.manager.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.controller.AlertSummaryController;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Safe failure boundary for Dashboard monitor and alert summary reads.
 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {SummaryController.class, AlertSummaryController.class})
public class DashboardReadControllerAdvice {

    private static final String STORAGE_UNAVAILABLE_MESSAGE = "Dashboard data is temporarily unavailable.";
    private static final String LOAD_FAILED_MESSAGE = "Dashboard data could not be loaded.";

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Message<Void>> storageUnavailable(DataAccessException exception) {
        log.warn("Dashboard read failed because its storage is unavailable", exception);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Message.fail(FAIL_CODE, STORAGE_UNAVAILABLE_MESSAGE));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Message<Void>> loadFailed(Exception exception) {
        log.error("Dashboard read failed unexpectedly", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Message.fail(FAIL_CODE, LOAD_FAILED_MESSAGE));
    }
}
