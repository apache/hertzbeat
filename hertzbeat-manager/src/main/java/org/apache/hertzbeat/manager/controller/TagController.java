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
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.manager.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tags management API
 */
@io.swagger.v3.oas.annotations.tags.Tag(name = "Tag Manage API")
@RestController
@RequestMapping(path = "/api/tag", produces = {APPLICATION_JSON_VALUE})
public class TagController {
    @Autowired
    private TagService tagService;

    @PostMapping
    @Operation(summary = "Add Tag", description = "Add Tag")
    public ResponseEntity<Message<Void>> addNewTags(@Valid @RequestBody List<Tag> tags) {
        tagService.addTags(tags);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modify an existing tag", description = "Modify an existing tag")
    public ResponseEntity<Message<Void>> modifyMonitor(@Valid @RequestBody Tag tag) {
        // Verify request data
        if (tag.getId() == null) {
            throw new IllegalArgumentException("ID cannot be null.");
        }
        tagService.modifyTag(tag);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping()
    @Operation(summary = "Get tags information", description = "Obtain label information based on conditions")
    public ResponseEntity<Message<Page<Tag>>> getTags(
            @Parameter(description = "Tag content search", example = "status") @RequestParam(required = false) String search,
            @Parameter(description = "Tag type", example = "0") @RequestParam(required = false) Byte type,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        return ResponseEntity.ok(Message.success(tagService.getTags(search, type, pageIndex, pageSize)));
    }

    @DeleteMapping()
    @Operation(summary = "Delete tags based on ID", description = "Delete tags based on ID")
    public ResponseEntity<Message<Void>> deleteTags(
            @Parameter(description = "TAG IDs ", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        tagService.deleteTags(new HashSet<>(ids));
        return ResponseEntity.ok(Message.success("Delete success"));
    }
}
