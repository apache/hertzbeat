/*
 *
 *  * Licensed to the Apache Software Foundation (ASF) under one or more
 *  * contributor license agreements.  See the NOTICE file distributed with
 *  * this work for additional information regarding copyright ownership.
 *  * The ASF licenses this file to You under the Apache License, Version 2.0
 *  * (the "License"); you may not use this file except in compliance with
 *  * the License.  You may obtain a copy of the License at
 *  *
 *  *     http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software
 *  * distributed under the License is distributed on an "AS IS" BASIS,
 *  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the License for the specific language governing permissions and
 *  * limitations under the License.
 *
 *
 */

package org.apache.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Parameter;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.Bulletin;
import org.apache.hertzbeat.manager.pojo.dto.BulletinDto;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Bulletin Controller
 */
@Controller
@RequestMapping("/api/bulletin")
public class BulletinController {

    @Autowired
    private BulletinService bulletinService;

    /**
     * add a new bulletin
     */
    @PostMapping
    public ResponseEntity<Message<Void>> addNewBulletin(@Valid @RequestBody BulletinDto bulletinDto) {

//        bulletinService.validate(bulletin, false);
//        bulletinService.saveBulletin(bulletin);
        return ResponseEntity.ok(Message.success("Add success"));
    }


    /**
     * page query bulletin
     */
    @GetMapping
    public ResponseEntity<Message<Page<Bulletin>>> pageQueryBulletin(
            @Parameter(description = "Bulletin Definition ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search-Target Expr Template", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages", example = "8") @RequestParam(defaultValue = "8") int pageSize)
     {
         Specification<Bulletin> specification = (root, query, criteriaBuilder) -> {
             List<Predicate> andList = new ArrayList<>();
             if (ids != null && !ids.isEmpty()) {
                 CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                 for (long id : ids) {
                     inPredicate.value(id);
                 }
                 andList.add(inPredicate);
             }
             if (StringUtils.hasText(search)) {
                 Predicate predicate = criteriaBuilder.or(
                         criteriaBuilder.like(
                                 criteriaBuilder.lower(root.get("app")),
                                 "%" + search.toLowerCase() + "%"
                         ),
                         criteriaBuilder.like(
                                 criteriaBuilder.lower(root.get("metric")),
                                 "%" + search.toLowerCase() + "%"
                         ),
                         criteriaBuilder.like(
                                 criteriaBuilder.lower(root.get("field")),
                                 "%" + search.toLowerCase() + "%"
                         ),
                         criteriaBuilder.like(
                                 criteriaBuilder.lower(root.get("expr")),
                                 "%" + search.toLowerCase() + "%"
                         ),
                         criteriaBuilder.like(
                                 criteriaBuilder.lower(root.get("template")),
                                 "%" + search.toLowerCase() + "%"
                         )
                 );
                 andList.add(predicate);
             }

             Predicate[] predicates = new Predicate[andList.size()];
             return criteriaBuilder.and(andList.toArray(predicates));
         };
         Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
         PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
         Page<Bulletin> bulletinsPage = bulletinService.getBulletins(specification, pageRequest);
         return ResponseEntity.ok(Message.success(bulletinsPage));
    }

}
