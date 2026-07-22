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

package org.apache.hertzbeat.manager.ui.runtime;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.RuntimeStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Version 1 UI runtime-status endpoint. */
@RestController
@RequestMapping(path = "/api/ui", produces = "application/json")
@Tag(name = "UI Runtime Status Controller")
@RequiredArgsConstructor
public class UiRuntimeStatusController {

    private final UiRuntimeStatusQuery query;

    @GetMapping("/runtime-status")
    @Operation(summary = "Get the versioned Server, storage, and Collector runtime status")
    public ResponseEntity<Message<RuntimeStatusResponse>> runtimeStatus() {
        return ResponseEntity.ok(Message.success(query.current()));
    }
}
