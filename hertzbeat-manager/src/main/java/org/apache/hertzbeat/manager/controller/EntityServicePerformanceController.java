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

package org.apache.hertzbeat.manager.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.PARAM_INVALID_CODE;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.EntityServicePerformancePage;
import org.apache.hertzbeat.manager.service.entity.EntityServicePerformanceReadModelService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Bounded read-only service ranking endpoint with local binding validation. */
@RestController
@RequiredArgsConstructor
public class EntityServicePerformanceController {
    private final EntityServicePerformanceReadModelService service;

    @GetMapping("/api/entities/services/red")
    @Operation(summary = "Rank the bounded authorized service catalog by RED evidence")
    public ResponseEntity<Message<EntityServicePerformancePage>> query(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String environment,
            @RequestParam long start,
            @RequestParam long end,
            @RequestParam(defaultValue = "errorCount") String sort,
            @RequestParam(defaultValue = "desc") String order,
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ResponseEntity.ok(Message.success(service.query(search, environment, start, end,
                sort, order, pageIndex, pageSize)));
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Message<Void>> invalidBinding() {
        return ResponseEntity.badRequest().body(Message.fail(PARAM_INVALID_CODE, ObservabilityQueryRequestException.ERROR_CODE));
    }
}
