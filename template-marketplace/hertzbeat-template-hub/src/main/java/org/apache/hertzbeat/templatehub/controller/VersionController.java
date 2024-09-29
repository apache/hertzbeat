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
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.exception.HertzbeatTemplateHubException;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.StarService;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
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
    
    @Autowired
    private StarService starService;

    @Autowired
    private TemplateService templateService;

    @Deprecated
    @GetMapping("/version/{template}")
    public ResponseEntity<Message<List<Version>>> getVersionsByTemplate(@PathVariable("template") int templateId){

        if(templateId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template information error"));
        }

        List<Version> versions = versionService.getVersions(templateId);

        return ResponseEntity.ok(Message.success(versions));
    }

    @GetMapping("/get/{versionId}")
    public ResponseEntity<Message<Version>> getVersionById(@PathVariable("versionId") int versionId){

        if(versionId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        Version version = versionService.getVersion(versionId);
        if(version==null){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"version not found"));
        }
        return ResponseEntity.ok(Message.success(version));
    }

    @GetMapping("/page/{template}/{isDel}")
    public ResponseEntity<Message<Page<Version>>> getVersionPageByTemplate(@PathVariable("template") int templateId,
                                                                           @PathVariable("isDel") int isDel,
                                                                           @RequestParam int page, @RequestParam int size){

        if(templateId==0|| page <0|| size <=0 || isDel<0 || isDel>1){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));
        }
        Page<Version> versionPageByTemplate = versionService.getVersionPageByTemplate(templateId, isDel, page, size);
        return ResponseEntity.ok(Message.success(versionPageByTemplate));
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

        if(templateDto.getUserId()==0||templateDto.getName().isEmpty()||templateDto.getCurrentVersion().isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template description information is missing"));
        }

        boolean upload = versionService.upload(templateDto, file);
        if(upload){
            return ResponseEntity.ok(Message.success(templateDto));
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE,"Error uploading version"));
    }

    @PostMapping("/star")
    @Transactional
    public ResponseEntity<Message<String>> starVersion(@RequestParam("user") int userId,@RequestParam("template") int templateId, @RequestParam("version") int versionId){

        if(userId==0||templateId==0||versionId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        String nowTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        int isOk = starService.starVersion(userId, templateId, versionId, nowTime);

        if(isOk==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"star version error"));
        }

        boolean isOk2 = versionService.startVersion(versionId);
        if(!isOk2){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"star version error"));
        }

        boolean isOk3 = templateService.starTemplate(templateId);
        if(!isOk3){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"star template error"));
        }

        return ResponseEntity.ok(Message.success("star version success"));
    }
}
