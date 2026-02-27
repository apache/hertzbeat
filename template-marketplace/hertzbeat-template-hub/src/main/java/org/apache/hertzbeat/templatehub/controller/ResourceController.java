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

package org.apache.hertzbeat.templatehub.controller;

import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.DO.AuthResourceDO;
import org.apache.hertzbeat.templatehub.service.ResourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * @author tomsun28
 * @date 00:24 2019-08-01
 */
@RequestMapping("/resource")
@RestController
@Slf4j
public class ResourceController {

    @Autowired
    private ResourceService resourceService;

    @PostMapping
    public ResponseEntity<Message> addResource(@RequestBody @Validated AuthResourceDO authResource) {
        if (resourceService.addResource(authResource)) {
            if (log.isDebugEnabled()) {
                log.debug("add resource success: {}", authResource);
            }
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } else {
            Message message = Message.builder().msg("resource already exist").build();
            return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
        }
    }

    @PutMapping
    public ResponseEntity<Message> updateResource(@RequestBody @Validated AuthResourceDO authResource) {
        if (resourceService.updateResource(authResource)) {
            if (log.isDebugEnabled()) {
                log.debug("update resource success: {}", authResource);
            }
            return ResponseEntity.ok().build();
        } else {
            Message message = Message.builder().msg("resource not exist").build();
            return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
        }
    }

    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Message> deleteResource(@PathVariable @NotBlank Long resourceId ) {
        if (resourceService.deleteResource(resourceId)) {
            if (log.isDebugEnabled()) {
                log.debug("delete resource success: {}", resourceId);
            }
            return ResponseEntity.ok().build();
        } else {
            Message message = Message.builder().msg("delete resource fail, please try again later").build();
            log.error("delete resource fail: {}", resourceId);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(message);
        }
    }

    @GetMapping("/{currentPage}/{pageSize}")
    public ResponseEntity<Message> getResource(@PathVariable Integer currentPage, @PathVariable Integer pageSize ) {
        if (Objects.isNull(currentPage) || Objects.isNull(pageSize)) {
            // no pageable
            Optional<List<AuthResourceDO>> resourceListOptional = resourceService.getAllResource();
            if (resourceListOptional.isPresent()) {
                Message message = Message.builder().data(resourceListOptional.get()).build();
                return ResponseEntity.ok().body(message);
            } else {
                Message message = Message.builder().data(new ArrayList<>(0)).build();
                return ResponseEntity.ok().body(message);
            }
        } else {
            // pageable
            Page<AuthResourceDO> resourcePage = resourceService.getPageResource(currentPage, pageSize);
            Message message = Message.builder().data(resourcePage.get()).build();
            return ResponseEntity.ok().body(message);
        }
    }

}
