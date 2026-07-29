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

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.annotation.Resource;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigResponse;
import org.apache.hertzbeat.manager.service.ObjectStoreConfigService;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Typed and redacted object-store configuration API. */
@RestController
@RequestMapping(value = "/api/config/oss", produces = APPLICATION_JSON_VALUE)
@Slf4j
public class ObjectStoreConfigController {

    @Resource
    private ObjectStoreConfigService objectStoreConfigService;

    @PostMapping
    @Operation(summary = "Save the object store config")
    public ResponseEntity<Message<ObjectStoreConfigResponse>> saveObjectStoreConfig(
            @RequestBody ObjectStoreConfigRequest request) {
        return handle(() -> objectStoreConfigService.saveAndGetSafeConfig(request));
    }

    @GetMapping
    @Operation(summary = "Get the object store config")
    public ResponseEntity<Message<ObjectStoreConfigResponse>> getObjectStoreConfig() {
        return handle(objectStoreConfigService::getSafeConfig);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Message<Void>> handleUnreadableRequest() {
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "Invalid object store config"));
    }

    private <T> ResponseEntity<Message<T>> handle(Supplier<T> action) {
        try {
            return ResponseEntity.ok(Message.success(action.get()));
        } catch (DataAccessException exception) {
            log.error("Object store storage unavailable: {}", exception.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Object store storage unavailable"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Invalid object store config"));
        } catch (Exception exception) {
            log.error("Object store config error: {}", exception.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Object store config error"));
        }
    }
}
