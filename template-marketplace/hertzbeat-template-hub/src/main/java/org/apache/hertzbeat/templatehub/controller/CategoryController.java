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

package org.apache.hertzbeat.templatehub.controller;

import org.apache.hertzbeat.templatehub.model.DO.CategoryDO;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.apache.hertzbeat.templatehub.service.CategoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("category")
public class CategoryController {

    @Autowired
    private CategoryService  categoryService;

    @PostMapping("/upload/{name}")
    public ResponseEntity<Message<String>> addCategory(@PathVariable("name") String name,
                                                      @RequestParam("description") String description) {

        if (name.isEmpty() || description.isEmpty()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        String nowTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        boolean isOK = categoryService.addCategory(name, description, nowTime);

        if(!isOK){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"add category failed"));
        }
        return ResponseEntity.ok(Message.success("add category success"));
    }

    @PostMapping("/modify/{id}")
    public ResponseEntity<Message<String>> modifyCategory(@PathVariable("id") int id,
                                                       @RequestParam("name") String name,
                                                       @RequestParam("description") String description) {

        if (id<=0 || name.isEmpty() || description.isEmpty()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        String nowTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        boolean isOK = categoryService.modifyCategory(id, name, description, nowTime);

        if(!isOK){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"modify category failed"));
        }
        return ResponseEntity.ok(Message.success("modify category success"));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Message<String>> deleteCategory(@PathVariable("id") int id) {

        if (id<=0) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"empty id"));
        }

        boolean isOK = categoryService.deleteCategory(id);

        if(!isOK){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"category is used"));
        }
        return ResponseEntity.ok(Message.success("delete category success"));
    }

    @GetMapping("/all/{isDel}")
    public ResponseEntity<Message<List<CategoryDO>>> getAllCategory(@PathVariable("isDel") int isDel) {

        if (isDel!=0&&isDel!=1) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"error option"));
        }

        List<CategoryDO> allCategoryDOByIsDel = categoryService.getAllCategoryByIsDel(isDel);

        return ResponseEntity.ok(Message.success(allCategoryDOByIsDel));
    }

    @GetMapping("/page/isDel/{isDel}")
    public ResponseEntity<Message<Page<CategoryDO>>> getCategoryPageByIsDel(@PathVariable("isDel") int isDel, @RequestParam int page, @RequestParam int size) {

        if (isDel!=0&&isDel!=1||page<0||size<0) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));
        }

        Page<CategoryDO> allCategoryByIsDel = categoryService.getPageByIsDel(isDel, page, size);

        return ResponseEntity.ok(Message.success(allCategoryByIsDel));
    }
}
