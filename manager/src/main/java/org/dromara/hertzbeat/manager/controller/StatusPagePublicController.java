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

package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.StatusPageIncident;
import org.dromara.hertzbeat.common.entity.manager.StatusPageOrg;
import org.dromara.hertzbeat.manager.pojo.dto.ComponentStatus;
import org.dromara.hertzbeat.manager.service.StatusPageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * status page public endpoint controller
 * @author tom
 */
@Tag(name = "Status Page Public API | 状态页对外API")
@RestController()
@RequestMapping(value = "/api/status/page/public", produces = {APPLICATION_JSON_VALUE})
public class StatusPagePublicController {


    @Autowired
    private StatusPageService statusPageService;
    
    @GetMapping("/org")
    @Operation(summary = "Query Status Page Organization")
    public ResponseEntity<Message<StatusPageOrg>> queryStatusPageOrg() {
        StatusPageOrg statusPageOrg = statusPageService.queryStatusPageOrg();
        if (statusPageOrg == null) {
            return ResponseEntity.ok(Message.fail(CommonConstants.FAIL_CODE, "Status Page Organization Not Found"));
        }
        return ResponseEntity.ok(Message.success(statusPageOrg));
    }
    
    @GetMapping("/component")
    @Operation(summary = "Query Status Page Components")
    public ResponseEntity<Message<List<ComponentStatus>>> queryStatusPageComponent() {
        List<ComponentStatus> componentStatusList = statusPageService.queryComponentsStatus();
        return ResponseEntity.ok(Message.success(componentStatusList));
    }
    
    @GetMapping("/component/{id}")
    @Operation(summary = "Query Status Page Component")
    public ResponseEntity<Message<ComponentStatus>> queryStatusPageComponent(@PathVariable("id") final long id) {
        ComponentStatus componentStatus = statusPageService.queryComponentStatus(id);
        return ResponseEntity.ok(Message.success(componentStatus));
    }

    @GetMapping("/incident")
    @Operation(summary = "Query Status Page Incidents")
    public ResponseEntity<Message<List<StatusPageIncident>>> queryStatusPageIncident() {
        List<StatusPageIncident> incidents = statusPageService.queryStatusPageIncidents();
        return ResponseEntity.ok(Message.success(incidents));
    }
}
