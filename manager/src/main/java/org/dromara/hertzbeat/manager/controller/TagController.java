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

import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.Tag;
import org.dromara.hertzbeat.manager.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Tags management API
 * 标签管理API
 * @author tomsun28
 *
 */
@io.swagger.v3.oas.annotations.tags.Tag(name = "Tag Manage API | 标签管理API")
@RestController
@RequestMapping(path = "/api/tag", produces = {APPLICATION_JSON_VALUE})
public class TagController {
    @Autowired
    private TagService tagService;

    @PostMapping
    @Operation(summary = "Add Tag", description = "新增标签")
    public ResponseEntity<Message<Void>> addNewTags(@Valid @RequestBody List<Tag> tags) {
        // Verify request data  校验请求数据 去重
        tags = tags.stream().peek(tag -> {
            tag.setType((byte) 1);
            tag.setId(null);
        }).distinct().collect(Collectors.toList());
        tagService.addTags(tags);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modify an existing tag", description = "修改一个已存在标签")
    public ResponseEntity<Message<Void>> modifyMonitor(@Valid @RequestBody Tag tag) {
        // Verify request data  校验请求数据
        if (tag.getId() == null || tag.getName() == null) {
            throw new IllegalArgumentException("The Tag not exist.");
        }
        tagService.modifyTag(tag);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping()
    @Operation(summary = "Get tags information", description = "根据条件获取标签信息")
    public ResponseEntity<Message<Page<Tag>>> getTags(
            @Parameter(description = "Tag content search | 标签内容模糊查询", example = "status") @RequestParam(required = false) String search,
            @Parameter(description = "Tag type | 标签类型", example = "0") @RequestParam(required = false) Byte type,
            @Parameter(description = "List current page | 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination | 列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        // Get tag information
        Specification<Tag> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (type != null) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("type"), type);
                andList.add(predicateApp);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + search + "%");
                orList.add(predicateName);
                Predicate predicateValue = criteriaBuilder.like(root.get("value"), "%" + search + "%");
                orList.add(predicateValue);
            }
            Predicate[] orPredicates = new Predicate[orList.size()];
            Predicate orPredicate = criteriaBuilder.or(orList.toArray(orPredicates));

            if (andPredicate.getExpressions().isEmpty() && orPredicate.getExpressions().isEmpty()) {
                return query.where().getRestriction();
            } else if (andPredicate.getExpressions().isEmpty()) {
                return query.where(orPredicate).getRestriction();
            } else if (orPredicate.getExpressions().isEmpty()) {
                return query.where(andPredicate).getRestriction();
            } else {
                return query.where(andPredicate, orPredicate).getRestriction();
            }
        };
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize);
        Page<Tag> alertPage = tagService.getTags(specification, pageRequest);
        Message<Page<Tag>> message = Message.success(alertPage);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping()
    @Operation(summary = "Delete tags based on ID", description = "根据TAG ID删除TAG")
    public ResponseEntity<Message<Void>> deleteTags(
            @Parameter(description = "TAG IDs | 监控任务ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            tagService.deleteTags(new HashSet<>(ids));
        }
        return ResponseEntity.ok(Message.success("Delete success"));
    }
}
