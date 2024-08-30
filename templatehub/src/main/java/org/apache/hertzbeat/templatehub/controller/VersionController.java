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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.apache.hertzbeat.templatehub.service.VersionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@RestController
@RequestMapping("version")
@CrossOrigin(origins = "*")
public class VersionController {

    @Autowired
    private VersionService  versionService;

    /**
     * Get all version information of a template
     * @return  Returns all version information of the template
     */
    @GetMapping("/version/{template}")
    public ResponseEntity<Message<List<Version>>> getVersionsByTemplate(@PathVariable("template") int templateId){

        if(templateId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template information error"));
        }

        return versionService.getVersions(templateId);
    }

    @PostMapping("/upload")
    public ResponseEntity<Message<Object>> uploadVersion(@ModelAttribute("templateDto") String s,
                                                          @RequestParam("file") MultipartFile file){
        if(file.isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"The version file is empty"));
        }

        if(s==null || s.isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"version info is empty"));
        }

        ObjectMapper objectMapper = new ObjectMapper();
        TemplateDto templateDto;
        try {
            templateDto = objectMapper.readValue(s, TemplateDto.class);
        } catch (JsonProcessingException e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template description information reading exception"+e.getMessage()));
        }
        templateDto.setCreate_time(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        templateDto.setUpdate_time(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        return versionService.upload(templateDto,file);
    }
}
