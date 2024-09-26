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

import org.apache.hertzbeat.templatehub.exception.HertzbeatTemplateHubException;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.apache.hertzbeat.templatehub.service.StarService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Objects;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.templatehub.constants.CommonConstants.SUCCESS_CODE;

@Slf4j
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("star")
public class StarController {

    @Autowired
    private StarService  starService;

    @Autowired
    private VersionService versionService;

    @Autowired
    private TemplateService templateService;

    @Deprecated
    @GetMapping("/{user}")
    public ResponseEntity<Message<List<Version>>> getAllVersionByUserStar(@PathVariable("user") int userId){
        if(userId<=0){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }

        List<Version> versionByUserStar = starService.getVersionByUserStar(userId, 0, 0, 0);

        if(versionByUserStar.isEmpty()){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }
        return ResponseEntity.ok(Message.success(versionByUserStar));
    }

    @GetMapping("/page/user/{user}")
    public ResponseEntity<Message<Page<Version>>> getVersionPageByUserStar(@PathVariable("user") int userId,
                                                                           @RequestParam(required = false) Integer page,
                                                                           @RequestParam(required = false) Integer size){
        if(userId<=0){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }

        Page<Version> versionByUserStar = starService.getPageByUserStar(userId, 0, 0, 0,page,size);

        if(versionByUserStar.getTotalElements()==0){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }
        return ResponseEntity.ok(Message.success(versionByUserStar));
    }

    @Transactional
    @PostMapping("/cancel/{user}")
    public ResponseEntity<Message<String>> cancelStar(@PathVariable("user") int userId, @RequestParam("versionId") int versionId){
        if(userId<=0||versionId<=0){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }

        Boolean isOk = starService.cancelStarByUser(userId, versionId);
        if(!isOk){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"cancel Error"));
        }

        int tempateId = versionService.cancelStarVersion(versionId);
        if(tempateId<=0){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"cancel Error"));
        }

        boolean isOk2 = templateService.cancelStarTemplate(tempateId);
        if(!isOk2){
            throw new HertzbeatTemplateHubException("cancel Error");
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"cancel Error"));
        }


        return ResponseEntity.ok(Message.success("success"));
    }
}
