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
import org.apache.hertzbeat.templatehub.model.DO.VersionDO;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
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

    @Deprecated
    @GetMapping("/version/{template}")
    public ResponseEntity<Message<List<VersionDO>>> getVersionsByTemplate(@PathVariable("template") int templateId){

        if(templateId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template information error"));
        }

        List<VersionDO> versionDOS = versionService.getVersions(templateId);

        return ResponseEntity.ok(Message.success(versionDOS));
    }

    @GetMapping("/get/{versionId}")
    public ResponseEntity<Message<VersionDO>> getVersionById(@PathVariable("versionId") int versionId){

        if(versionId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        VersionDO versionDO = versionService.getVersion(versionId);
        if(versionDO ==null){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"version not found"));
        }
        return ResponseEntity.ok(Message.success(versionDO));
    }

    @GetMapping("/page/{template}/{isDel}")
    public ResponseEntity<Message<Page<VersionDO>>> getVersionPageByTemplate(@PathVariable("template") int templateId,
                                                                             @PathVariable("isDel") int isDel,
                                                                             @RequestParam int page, @RequestParam int size){

        if(templateId==0|| page <0|| size <=0 || isDel<0 || isDel>1){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));
        }
        Page<VersionDO> versionPageByTemplate = versionService.getVersionPageByTemplate(templateId, isDel, page, size);
        return ResponseEntity.ok(Message.success(versionPageByTemplate));
    }

    @PostMapping("/upload")
    public ResponseEntity<Message<String>> uploadVersion(@ModelAttribute("templateDto") String s,
                                                          @RequestParam("file") MultipartFile file){
        if(file.isEmpty()) return ResponseEntity.ok(Message.fail(FAIL_CODE,"The version file is empty"));

        if(s==null || s.isEmpty()) return ResponseEntity.ok(Message.fail(FAIL_CODE,"version info is empty"));

        ObjectMapper objectMapper = new ObjectMapper();
        TemplateDto templateDto;
        try {
            templateDto = objectMapper.readValue(s, TemplateDto.class);
        } catch (JsonProcessingException e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,
                    "Template description information reading exception"+e.getMessage()));
        }
        templateDto.setCreate_time(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        templateDto.setUpdate_time(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        if(templateDto.getUserId()==0||templateDto.getName().isEmpty()||templateDto.getCurrentVersion().isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template description information is missing"));
        }

        boolean upload = versionService.upload(templateDto, file);
        if(upload) return ResponseEntity.ok(Message.success("upload success"));
        return ResponseEntity.ok(Message.fail(FAIL_CODE,"Error uploading version"));
    }
}