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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.VO.TemplateVO;
import org.apache.hertzbeat.templatehub.service.StarService;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

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

    @GetMapping("/{user}")
    public ResponseEntity<Message<List<Integer>>> getAllTemplateIdByUserStar(@PathVariable("user") int userId){
        if(userId<=0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));

        List<Integer> templateByUserStar = starService.getTemplateByUserStar(userId, 0);
        Collections.sort(templateByUserStar);
        return ResponseEntity.ok(Message.success(templateByUserStar));
    }

    @GetMapping("/isStar/{user}/{templateId}")
    public ResponseEntity<Message<Boolean>> assertTemplateIdIsStarByUser(@PathVariable("user") int userId,
                                                                         @PathVariable("templateId") int templateId){
        if(userId<=0||templateId<=0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));

        Boolean b = starService.assertTemplateIdIsStarByUser(userId, templateId);

        return ResponseEntity.ok(Message.success(b));
    }

    @GetMapping("/page/user/{user}")
    public ResponseEntity<Message<Page<TemplateVO>>> getTemplatePageByUserStar(@PathVariable("user") int userId,
                                                                              @RequestParam(required = false) Integer page,
                                                                              @RequestParam(required = false) Integer size){
        if(userId<=0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
        }

        Page<TemplateDO> res = starService.getPageByUserStar(userId, 0, 0, 0,page,size);
        List<TemplateVO> templateVOList = res.getContent()
                .stream()
                .map(templateDO -> new TemplateVO(templateDO,true))
                .toList();
        return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), res.getTotalElements())));
    }

    @Transactional
    @PostMapping("/cancel/{user}")
    public ResponseEntity<Message<String>> cancelStar(@PathVariable("user") int userId, @RequestParam("templateId") int templateId){
        if(userId<=0||templateId<=0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));
        }

        boolean b=starService.assertTemplateIdIsStarByUser(userId, templateId);
        if(!b){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template is not star"));
        }

        Boolean isOk = starService.cancelStarByUser(userId, templateId);
        if(!isOk){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"cancel Error"));
        }

        boolean isOk2 = templateService.cancelStarTemplate(templateId);
        if(!isOk2){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"cancel Error"));
        }
        return ResponseEntity.ok(Message.success("cancel success"));
    }
}
