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
import org.apache.hertzbeat.templatehub.model.DO.AuthRoleDO;
import org.apache.hertzbeat.templatehub.service.RoleService;
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
@RestController
@RequestMapping("/role")
@Slf4j
public class RoleController {

    @Autowired
    private RoleService roleService;


    @GetMapping("/resource/{roleId}/{currentPage}/{pageSize}")
    public ResponseEntity<Message> getResourceOwnByRole(@PathVariable @NotBlank Long roleId, @PathVariable Integer currentPage, @PathVariable Integer pageSize) {
        if (currentPage == null){
            currentPage = 1;
        }
        if (pageSize == null) {
            pageSize = 10;
        }
        Page<AuthResourceDO> resourcePage = roleService.getPageResourceOwnRole(roleId, currentPage, pageSize);
        Message message = Message.builder().data(resourcePage).build();
        return ResponseEntity.ok().body(message);
    }

    @GetMapping("/resource/-/{roleId}/{currentPage}/{pageSize}")
    public ResponseEntity<Message> getResourceNotOwnByRole(@PathVariable @NotBlank Long roleId, @PathVariable Integer currentPage, @PathVariable Integer pageSize) {
        if (currentPage == null){
            currentPage = 1;
        }
        if (pageSize == null) {
            pageSize = 10;
        }
        Page<AuthResourceDO> resourcePage = roleService.getPageResourceNotOwnRole(roleId, currentPage, pageSize);
        Message message = Message.builder().data(resourcePage).build();
        return ResponseEntity.ok().body(message);
    }

    @PostMapping("/authority/resource/{roleId}/{resourceId}")
    public ResponseEntity<Message> authorityRoleResource(@PathVariable @NotBlank Long roleId,
                                                         @PathVariable @NotBlank Long resourceId) {
        roleService.authorityRoleResource(roleId,resourceId);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @DeleteMapping("/authority/resource/{roleId}/{resourceId}")
    public ResponseEntity<Message> deleteAuthorityRoleResource(@PathVariable @NotBlank Long roleId,
                                                         @PathVariable @NotBlank Long resourceId) {
        roleService.deleteAuthorityRoleResource(roleId,resourceId);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PostMapping
    public ResponseEntity<Message> addRole(@RequestBody @Validated AuthRoleDO authRole) {
        if (roleService.addRole(authRole)) {
            if (log.isDebugEnabled()) {
                log.debug("add role success: {}", authRole);
            }
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } else {
            Message message = Message.builder()
                    .msg("role already exist").build();
            return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
        }
    }

    @PutMapping
    public ResponseEntity<Message> updateRole(@RequestBody @Validated AuthRoleDO authRole) {
        if (roleService.updateRole(authRole)) {
            if (log.isDebugEnabled()) {
                log.debug("update role success: {}", authRole);
            }
            return ResponseEntity.ok().build();
        } else {
            Message message = Message.builder()
                    .msg("role not exist").build();
            return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
        }
    }

    @DeleteMapping("/{roleId}")
    public ResponseEntity<Message> deleteRole(@PathVariable @NotBlank Long roleId) {
        if (roleService.deleteRole(roleId)) {
            if (log.isDebugEnabled()) {
                log.debug("delete role success: {}", roleId);
            }
            return ResponseEntity.ok().build();
        } else {
            Message message = Message.builder()
                    .msg("delete role fail, no this role here").build();
            log.debug("delete role fail: {}", roleId);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
        }
    }

    @GetMapping("/{currentPage}/{pageSize}")
    public ResponseEntity<Message> getRole(@PathVariable Integer currentPage, @PathVariable Integer pageSize ) {
        if (Objects.isNull(currentPage) || Objects.isNull(pageSize)) {
            // no pageable
            Optional<List<AuthRoleDO>> roleListOptional = roleService.getAllRole();
            if (roleListOptional.isPresent()) {
                Message message = Message.builder().data(roleListOptional.get()).build();
                return ResponseEntity.ok().body(message);
            } else {
                Message message = Message.builder().data(new ArrayList<>()).build();
                return ResponseEntity.ok().body(message);
            }
        } else {
            // pageable
            Page<AuthRoleDO> rolePage = roleService.getPageRole(currentPage, pageSize);
            Message message = Message.builder().data(rolePage).build();
            return ResponseEntity.ok().body(message);
        }
    }

}
