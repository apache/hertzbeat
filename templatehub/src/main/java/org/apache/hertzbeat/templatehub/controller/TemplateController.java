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
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("template")
public class TemplateController {

    @Autowired
    private TemplateService  templateService;

    @PostMapping("/upload")
    public ResponseEntity<Message<Object>> uploadTemplate(@ModelAttribute("templateDto") String s,
                                                          @RequestParam("file") MultipartFile file){
        if(file.isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"The template file is empty"));
        }

        if(s==null || s.isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template info is empty"));
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

        return templateService.upload(templateDto,file);
    }

    /**
     * Get all template information of a user
     *
     * @return Returns all template information of the user
     */
    @GetMapping("/{user}")
    public ResponseEntity<Message<List<Template>>> getAllTemplateByUser(@PathVariable("user") int userId){
        if(userId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }

        return templateService.getAllTemplatesByUserId(userId);
    }

    /**
     * Get all template information
     */
    @GetMapping("/")
    public ResponseEntity<Message<List<Template>>> getAllTemplates(){

        //todo Modify this method to paginated query
        return templateService.getAllTemplates();
    }

    @GetMapping("/download/{ownerId}/{templateId}/{version}")
    public ResponseEntity<Resource> download(@PathVariable("ownerId") Integer ownerId, @PathVariable("templateId") Integer templateId,
                                             @PathVariable("version") String version) {

        if (templateId == null || version == null || ownerId==null) {
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"id is empty"));
            throw new IllegalArgumentException("id empty");
        }

        return templateService.downloadTemplate(ownerId, templateId,version);
    }

    @DeleteMapping("/delete/{ownerId}/{templateId}/{version}")
    public ResponseEntity<Message<String>> deleteFile(@PathVariable("ownerId") Integer ownerId,
                           @PathVariable("templateId") Integer templateId,
                           @PathVariable("version") String version) {

        if (templateId == null || version == null || ownerId==null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"id is empty"));
        }

        return templateService.deleteTemplate(ownerId, templateId,version);
    }
}
