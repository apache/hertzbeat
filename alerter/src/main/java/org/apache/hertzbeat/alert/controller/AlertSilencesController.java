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

package org.apache.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Silence the batch API for alarms
 */
@Tag(name = "Alert Silence Batch API")
@RestController
@RequestMapping(path = "/api/alert/silences", produces = {APPLICATION_JSON_VALUE})
public class AlertSilencesController {

    @Autowired
    private AlertSilenceService alertSilenceService;

    @GetMapping
    @Operation(summary = "Query the alarm silence list",
            description = "You can obtain the list of alarm silence by querying filter items")
    public ResponseEntity<Message<Page<AlertSilence>>> getAlertSilences(
            @Parameter(description = "Alarm Silence ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search Name", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<AlertSilence> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate= criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(search)) {
                Predicate predicate = criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                "%" + search.toLowerCase() + "%"
                        )
                );
                andList.add(predicate);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<AlertSilence> alertSilencePage = alertSilenceService.getAlertSilences(specification, pageRequest);
        Message<Page<AlertSilence>> message = Message.success(alertSilencePage);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @Operation(summary = "Delete alarm silence in batches",
            description = "Delete alarm silence in batches based on the alarm silence ID list")
    public ResponseEntity<Message<Void>> deleteAlertDefines(
            @Parameter(description = "Alarm Silence IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            alertSilenceService.deleteAlertSilences(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

}
