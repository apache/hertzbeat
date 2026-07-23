/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryReadModel;
import org.apache.hertzbeat.manager.service.entity.EntityDiscoveryReadModelService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Resource discovery aggregation API for the operator UI.
 */
@RestController
@RequestMapping(path = "/api/entities", produces = APPLICATION_JSON_VALUE)
public class EntityDiscoveryController {

    private static final int MAX_SEARCH_LENGTH = 200;
    private static final int MAX_PAGE_SIZE = 50;

    private final EntityDiscoveryReadModelService service;

    public EntityDiscoveryController(EntityDiscoveryReadModelService service) {
        this.service = service;
    }

    @GetMapping("/discovery")
    public ResponseEntity<Message<EntityDiscoveryReadModel>> getDiscovery(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") String pageIndex,
            @RequestParam(defaultValue = "8") String pageSize) {
        String normalizedSearch = normalizeSearch(search);
        int normalizedPageIndex = parsePageIndex(pageIndex);
        int normalizedPageSize = parsePageSize(pageSize);
        return ResponseEntity.ok(Message.success(
                service.getDiscovery(normalizedSearch, normalizedPageIndex, normalizedPageSize)));
    }

    private static String normalizeSearch(String search) {
        if (search == null) {
            return null;
        }
        String normalized = search.trim();
        if (normalized.length() > MAX_SEARCH_LENGTH) {
            throw new IllegalArgumentException("entity_discovery_search_invalid");
        }
        return normalized.isEmpty() ? null : normalized;
    }

    private static int parsePageIndex(String pageIndex) {
        int parsed = parseInteger(pageIndex, "entity_discovery_page_index_invalid");
        if (parsed < 0) {
            throw new IllegalArgumentException("entity_discovery_page_index_invalid");
        }
        return parsed;
    }

    private static int parsePageSize(String pageSize) {
        int parsed = parseInteger(pageSize, "entity_discovery_page_size_invalid");
        if (parsed < 1 || parsed > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("entity_discovery_page_size_invalid");
        }
        return parsed;
    }

    private static int parseInteger(String value, String error) {
        try {
            return Integer.parseInt(value.trim());
        } catch (RuntimeException ignored) {
            throw new IllegalArgumentException(error);
        }
    }
}
