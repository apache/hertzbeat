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
import com.google.common.primitives.Longs;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Monitor and manage batch API
 */
@Tag(name = "Monitor Manage Batch API")
@RestController
@RequestMapping(path = "/api/monitors", produces = {APPLICATION_JSON_VALUE})
public class MonitorsController {

    @Autowired
    private MonitorService monitorService;

    @GetMapping
    @Operation(summary = "Obtain a list of monitoring information based on query filter items",
            description = "Obtain a list of monitoring information based on query filter items")
    public ResponseEntity<Message<Page<MonitorInfo>>> getMonitors(
            @Parameter(description = "Monitor ID", example = "6565463543") @RequestParam(required = false) final List<Long> ids,
            @Parameter(description = "Legacy Monitor ID", example = "6565463543") @RequestParam(required = false) final String id,
            @Parameter(description = "Monitor Type", example = "linux") @RequestParam(required = false) final String app,
            @Parameter(description = "Monitor Status 0:no monitor,1:usable,2:disabled,9:all status", example = "1") @RequestParam(required = false) final Byte status,
            @Parameter(description = "Monitor Host support fuzzy query", example = "127.0.0.1") @RequestParam(required = false) final String search,
            @Parameter(description = "Legacy monitor host fuzzy query", example = "127.0.0.1") @RequestParam(required = false) final String host,
            @Parameter(description = "Monitor labels ", example = "env:prod,instance:22") @RequestParam(required = false) final String labels,
            @Parameter(description = "Sort Field ", example = "name") @RequestParam(defaultValue = "gmtCreate") final String sort,
            @Parameter(description = "Sort mode eg:asc desc", example = "desc") @RequestParam(defaultValue = "desc") final String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination ", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        List<Long> effectiveIds = resolveMonitorIds(ids, id);
        String effectiveSearch = StringUtils.hasText(search) ? search : host;
        Page<Monitor> monitorPage = monitorService.getMonitors(
                effectiveIds, app, effectiveSearch, status, sort, order, pageIndex, pageSize, labels);
        Page<MonitorInfo> responsePage = monitorPage == null ? Page.empty() : monitorPage.map(MonitorInfo::fromEntity);
        return ResponseEntity.ok(Message.success(responsePage));
    }

    @GetMapping(path = "/{app}")
    @Operation(summary = "Filter all acquired monitoring information lists of the specified monitoring type according to the query",
            description = "Filter all acquired monitoring information lists of the specified monitoring type according to the query")
    public ResponseEntity<Message<List<MonitorInfo>>> getAppMonitors(
            @Parameter(description = "en: Monitoring type", example = "linux") @PathVariable(required = false) final String app) {
        List<Monitor> monitors = monitorService.getAppMonitors(app);
        List<MonitorInfo> response = monitors == null ? Collections.emptyList()
                : monitors.stream().map(MonitorInfo::fromEntity).toList();
        return ResponseEntity.ok(Message.success(response));
    }


    @DeleteMapping
    @Operation(summary = "Delete monitoring items in batches according to the monitoring ID list",
            description = "Delete monitoring items in batches according to the monitoring ID list")
    public ResponseEntity<Message<Void>> deleteMonitors(
            @Parameter(description = "Monitoring ID List", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Legacy monitoring ID", example = "6565463543") @RequestParam(required = false) String id,
            @Parameter(description = "Legacy monitoring ID JSON body", example = "[6565463543]") @RequestBody(required = false) List<Long> bodyIds
    ) {
        Set<Long> effectiveIds = resolveBatchIds(ids, id, bodyIds);
        if (!effectiveIds.isEmpty()) {
            monitorService.deleteMonitors(effectiveIds);
        }
        return ResponseEntity.ok(Message.success());
    }

    @DeleteMapping("manage")
    @Operation(summary = "Unmanaged monitoring items in batches according to the monitoring ID list",
            description = "Unmanaged monitoring items in batches according to the monitoring ID list")
    public ResponseEntity<Message<Void>> cancelManageMonitors(
            @Parameter(description = "Monitoring ID List", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Legacy monitoring ID", example = "6565463543") @RequestParam(required = false) String id,
            @Parameter(description = "Legacy monitoring ID JSON body", example = "[6565463543]") @RequestBody(required = false) List<Long> bodyIds
    ) {
        Set<Long> effectiveIds = resolveBatchIds(ids, id, bodyIds);
        if (!effectiveIds.isEmpty()) {
            monitorService.cancelManageMonitors(effectiveIds);
        }
        return ResponseEntity.ok(Message.success());
    }

    @GetMapping("manage")
    @Operation(summary = "Start the managed monitoring items in batches according to the monitoring ID list",
            description = "Start the managed monitoring items in batches according to the monitoring ID list")
    public ResponseEntity<Message<Void>> enableManageMonitors(
            @Parameter(description = "Monitor ID List", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Legacy monitor ID", example = "6565463543") @RequestParam(required = false) String id,
            @Parameter(description = "Legacy monitor ID JSON body", example = "[6565463543]") @RequestBody(required = false) List<Long> bodyIds
    ) {
        return enableManageMonitorsByIds(ids, id, bodyIds);
    }

    @PostMapping("manage")
    @Operation(summary = "Start the managed monitoring items in batches according to the monitoring ID list",
            description = "Start the managed monitoring items in batches according to the monitoring ID list")
    public ResponseEntity<Message<Void>> enableManageMonitorsByPost(
            @Parameter(description = "Monitor ID List", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Legacy monitor ID", example = "6565463543") @RequestParam(required = false) String id,
            @Parameter(description = "Legacy monitor ID JSON body", example = "[6565463543]") @RequestBody(required = false) List<Long> bodyIds
    ) {
        return enableManageMonitorsByIds(ids, id, bodyIds);
    }

    @PutMapping("manage")
    @Operation(summary = "Start the managed monitoring items in batches according to the monitoring ID list",
            description = "Start the managed monitoring items in batches according to the monitoring ID list")
    public ResponseEntity<Message<Void>> enableManageMonitorsByPut(
            @Parameter(description = "Monitor ID List", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Legacy monitor ID", example = "6565463543") @RequestParam(required = false) String id,
            @Parameter(description = "Legacy monitor ID JSON body", example = "[6565463543]") @RequestBody(required = false) List<Long> bodyIds
    ) {
        return enableManageMonitorsByIds(ids, id, bodyIds);
    }

    private ResponseEntity<Message<Void>> enableManageMonitorsByIds(List<Long> ids, String id, List<Long> bodyIds) {
        Set<Long> effectiveIds = resolveBatchIds(ids, id, bodyIds);
        if (!effectiveIds.isEmpty()) {
            monitorService.enableManageMonitors(effectiveIds);
        }
        return ResponseEntity.ok(Message.success());
    }

    private static List<Long> resolveMonitorIds(List<Long> ids, String legacyId) {
        if (ids != null && !ids.isEmpty()) {
            return ids;
        }
        List<Long> legacyIds = resolveLegacyIds(legacyId);
        return legacyIds.isEmpty() ? ids : legacyIds;
    }

    private static Set<Long> resolveBatchIds(List<Long> queryIds, String legacyId, List<Long> bodyIds) {
        List<Long> effectiveIds = queryIds != null && !queryIds.isEmpty() ? queryIds : resolveLegacyIds(legacyId);
        if (effectiveIds == null || effectiveIds.isEmpty()) {
            effectiveIds = bodyIds;
        }
        if (effectiveIds == null || effectiveIds.isEmpty()) {
            return Collections.emptySet();
        }
        return new LinkedHashSet<>(effectiveIds);
    }

    private static List<Long> resolveLegacyIds(String legacyId) {
        if (!StringUtils.hasText(legacyId)) {
            return Collections.emptyList();
        }
        List<Long> parsedIds = new ArrayList<>();
        for (String candidate : StringUtils.commaDelimitedListToStringArray(legacyId)) {
            Long parsedId = Longs.tryParse(candidate.trim());
            if (parsedId != null) {
                parsedIds.add(parsedId);
            }
        }
        return parsedIds;
    }

    @GetMapping("/export")
    @Operation(summary = "export monitor config", description = "export monitor config")
    public void export(
            @Parameter(description = "Monitor ID List", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Legacy Monitor ID", example = "6565463543") @RequestParam(required = false) String id,
            @Parameter(description = "Export Type:JSON,EXCEL") @RequestParam(defaultValue = "JSON") String type,
            HttpServletResponse res) throws Exception {
        monitorService.export(resolveRequiredMonitorIds(ids, id), type, res);
    }

    @GetMapping("/export/all")
    @Operation(summary = "export all monitor config", description = "export all monitor config")
    public void exportAll(
            @Parameter(description = "Export Type:JSON,EXCEL,YAML") @RequestParam(defaultValue = "JSON") String type,
            HttpServletResponse res) throws Exception {
        monitorService.exportAll(type, res);
    }

    @PostMapping("/import")
    @Operation(summary = "import monitor config", description = "import monitor config")
    public ResponseEntity<Message<Void>> importMonitors(
            @Parameter(description = "Monitor config file") @RequestParam("file") MultipartFile file) throws Exception {
        monitorService.importConfig(file);
        return ResponseEntity.ok(Message.success("Import success"));
    }

    private static List<Long> resolveRequiredMonitorIds(List<Long> ids, String legacyId)
            throws MissingServletRequestParameterException {
        List<Long> effectiveIds = resolveMonitorIds(ids, legacyId);
        if (effectiveIds == null || effectiveIds.isEmpty()) {
            throw new MissingServletRequestParameterException("ids", "List");
        }
        return effectiveIds;
    }
}
