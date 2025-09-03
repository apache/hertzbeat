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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;

/**
 * Controller for managing log entries in HertzBeat.
 */
@RestController
@RequestMapping(path = "/api/logs", produces = "application/json")
@Tag(name = "Log Management Controller")
@Slf4j
public class LogManagerController {

    private final HistoryDataWriter historyDataWriter;

    public LogManagerController(HistoryDataWriter historyDataWriter) {
        this.historyDataWriter = historyDataWriter;
    }

    @DeleteMapping
    @Operation(summary = "Batch delete logs", 
               description = "Batch delete logs by time timestamps. Deletes multiple log entries based on their Unix nanosecond timestamps.")
    public ResponseEntity<Message<String>> batchDelete(
            @Parameter(description = "List of Unix nanosecond timestamps for logs to delete", example = "1640995200000000000") 
            @RequestParam(required = false) List<Long> timeUnixNanos) {
        boolean result = historyDataWriter.batchDeleteLogs(timeUnixNanos);
        if (result) {
            return ResponseEntity.ok(Message.success("Logs deleted successfully"));
        } else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Failed to delete logs"));
        }
    }
}
