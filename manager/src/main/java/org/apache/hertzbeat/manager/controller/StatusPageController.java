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

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import javax.validation.Valid;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * status page endpoint controller
 */
@Tag(name = "Status Page API")
@RestController()
@RequestMapping(value = "/api/status/page", produces = {APPLICATION_JSON_VALUE})
public class StatusPageController {

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

    @PostMapping("/org")
    @Operation(summary = "Save and Update Query Status Page Organization")
    public ResponseEntity<Message<StatusPageOrg>> saveStatusPageOrg(@Valid @RequestBody StatusPageOrg statusPageOrg) {
        StatusPageOrg org = statusPageService.saveStatusPageOrg(statusPageOrg);
        return ResponseEntity.ok(Message.success(org));
    }
    
    @GetMapping("/component")
    @Operation(summary = "Query Status Page Components")
    public ResponseEntity<Message<List<StatusPageComponent>>> queryStatusPageComponent() {
        List<StatusPageComponent> statusPageComponents = statusPageService.queryStatusPageComponents();
        return ResponseEntity.ok(Message.success(statusPageComponents));
    }
    
    @PostMapping("/component")
    @Operation(summary = "Save Status Page Component")
    public ResponseEntity<Message<Void>> newStatusPageComponent(@Valid @RequestBody StatusPageComponent statusPageComponent) {
        statusPageService.newStatusPageComponent(statusPageComponent);
        return ResponseEntity.ok(Message.success("Add success"));
    }
    
    @PutMapping("/component")
    @Operation(summary = "Update Status Page Component")
    public ResponseEntity<Message<Void>> updateStatusPageComponent(@Valid @RequestBody StatusPageComponent statusPageComponent) {
        statusPageService.updateStatusPageComponent(statusPageComponent);
        return ResponseEntity.ok(Message.success("Update success"));
    }
    
    @DeleteMapping("/component/{id}")
    @Operation(summary = "Delete Status Page Component")
    public ResponseEntity<Message<Void>> deleteStatusPageComponent(@PathVariable("id") final long id) {
        statusPageService.deleteStatusPageComponent(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }
    
    @GetMapping("/component/{id}")
    @Operation(summary = "Query Status Page Component")
    public ResponseEntity<Message<StatusPageComponent>> queryStatusPageComponent(@PathVariable("id") final long id) {
        StatusPageComponent statusPageComponent = statusPageService.queryStatusPageComponent(id);
        return ResponseEntity.ok(Message.success(statusPageComponent));
    }

    @PostMapping("/incident")
    @Operation(summary = "Save Status Page Incident")
    public ResponseEntity<Message<Void>> newStatusPageIncident(@Valid @RequestBody StatusPageIncident incident) {
        statusPageService.newStatusPageIncident(incident);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping("/incident")
    @Operation(summary = "Update Status Page Incident")
    public ResponseEntity<Message<Void>> updateStatusPageIncident(@Valid @RequestBody StatusPageIncident incident) {
        statusPageService.updateStatusPageIncident(incident);
        return ResponseEntity.ok(Message.success("Update success"));
    }

    @DeleteMapping("/incident/{id}")
    @Operation(summary = "Delete Status Page Incident")
    public ResponseEntity<Message<Void>> deleteStatusPageIncident(@PathVariable("id") final long id) {
        statusPageService.deleteStatusPageIncident(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping("/incident/{id}")
    @Operation(summary = "Get Status Page Incident")
    public ResponseEntity<Message<StatusPageIncident>> queryStatusPageIncident(@PathVariable("id") final long id) {
        StatusPageIncident incident = statusPageService.queryStatusPageIncident(id);
        return ResponseEntity.ok(Message.success(incident));
    }

    @GetMapping("/incident")
    @Operation(summary = "Query Status Page Incidents")
    public ResponseEntity<Message<List<StatusPageIncident>>> queryStatusPageIncident() {
        List<StatusPageIncident> incidents = statusPageService.queryStatusPageIncidents();
        return ResponseEntity.ok(Message.success(incidents));
    }
}
