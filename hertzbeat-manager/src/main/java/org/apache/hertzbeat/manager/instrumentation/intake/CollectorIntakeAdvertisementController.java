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

package org.apache.hertzbeat.manager.instrumentation.intake;

import static org.apache.hertzbeat.common.constants.CommonConstants.PARAM_INVALID_CODE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.ErrorCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Management API for an explicit safe Collector intake advertisement. */
@RestController
@RequestMapping(path = "/api/collector", produces = "application/json")
@Tag(name = "Collector Instrumentation Intake Controller")
@RequiredArgsConstructor
public class CollectorIntakeAdvertisementController {

    private final CollectorIntakeAdvertisementService service;
    private final CollectorIntakeAdvertisementCodec codec;

    @PutMapping(path = "/{collector}/instrumentation-intake", consumes = "application/json")
    @Operation(summary = "Persist a versioned safe Collector instrumentation intake advertisement")
    public ResponseEntity<Message<CollectorInstrumentationIntake>> update(
            @PathVariable String collector, @RequestBody String requestBody) {
        return ResponseEntity.ok(Message.success(service.update(collector, codec.decode(requestBody))));
    }

    @DeleteMapping("/{collector}/instrumentation-intake")
    @Operation(summary = "Clear a Collector instrumentation intake advertisement")
    public ResponseEntity<Message<CollectorInstrumentationIntake>> clear(@PathVariable String collector) {
        return ResponseEntity.ok(Message.success(service.clear(collector)));
    }

    @ExceptionHandler(CollectorIntakeAdvertisementException.class)
    public ResponseEntity<Message<Void>> invalidAdvertisement() {
        return ResponseEntity.ok(Message.fail(PARAM_INVALID_CODE, ErrorCode.INTAKE_ADVERTISEMENT_INVALID.code()));
    }
}
