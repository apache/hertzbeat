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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTestService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

/** Administrator-only synthetic probe; neither endpoint changes the provider configuration. */
@RestController
@RequestMapping(path = "/api/agent/model-providers/connection-tests", produces = "application/json")
public class ModelProviderConnectionTestController {
    private final ProviderConnectionTestService tests;

    public ModelProviderConnectionTestController(ProviderConnectionTestService tests) { this.tests = tests; }

    @PostMapping
    public ResponseEntity<Message<ProviderConnectionTest.Result>> test(@RequestBody ProviderConnectionTest.Request request) {
        String owner = owner();
        if (owner == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Message.fail((byte) -1, "Administrator role is required"));
        }
        try {
            return ResponseEntity.ok(Message.success(tests.test(owner, request)));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Message.fail((byte) -1, "Invalid connection test request"));
        }
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<Message<Boolean>> cancel(@PathVariable String requestId) {
        String owner = owner();
        if (owner == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Message.fail((byte) -1, "Administrator role is required"));
        }
        try {
            return ResponseEntity.ok(Message.success(tests.cancel(owner, requestId)));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Message.fail((byte) -1, "Invalid connection test request"));
        }
    }

    private String owner() {
        try {
            var actor = ActorSupport.requireCurrentAdminSurenessActor();
            return AuthTokenRequestContext.currentWorkspaceId() + ":" + actor.getType() + ":" + actor.getId();
        } catch (IllegalStateException unauthorized) {
            return null;
        }
    }
}
