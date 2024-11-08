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
import org.apache.hertzbeat.templatehub.exception.HertzbeatTemplateHubException;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.model.DO.VersionDO;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
import org.apache.hertzbeat.templatehub.model.VO.TemplateVO;
import org.apache.hertzbeat.templatehub.service.StarService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.jetbrains.annotations.NotNull;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@RestController
@CrossOrigin(origins = "*",maxAge = 3600)
@RequestMapping("template")
public class TemplateController {

    @Autowired
    private TemplateService  templateService;

    @Autowired
    private VersionService versionService;

    @Autowired
    private StarService starService;

    @PostMapping("/localFileUpload")
    public ResponseEntity<Message<String>> localFileUpload(@RequestParam("file") MultipartFile file){

        return ResponseEntity.ok(Message.success("ok"));
    }

    @PostMapping("/upload")
    public ResponseEntity<Message<String>> uploadTemplate(@ModelAttribute("templateDto") String s,
                                                          @RequestParam("file") MultipartFile file){
        if(file.isEmpty()||s==null || s.isEmpty()) return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));

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
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        boolean upload = templateService.upload(templateDto, file);
        if(upload) return ResponseEntity.ok(Message.success("upload success"));
        return ResponseEntity.ok(Message.fail(FAIL_CODE,"upload fail"));
    }

    @GetMapping("/count/{isDel}/{offShelf}")
    public ResponseEntity<Message<Integer>> getCountByIsDelAndOffshelf(@PathVariable("isDel") int isDel, @PathVariable("offShelf") int offshelf){
        if(isDel<0 || offshelf<0 || isDel>1 || offshelf>1) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        int countByIsDelAndOffShelf = templateService.getCountByIsDelAndOffShelf(isDel, offshelf);
        return ResponseEntity.ok(Message.success(countByIsDelAndOffShelf));
    }

    @GetMapping("/page/category/{categoryIdStr}/{isDel}/{orderOption}/{userId}")
    public ResponseEntity<Message<Page<TemplateVO>>> getTemplatePageByCategory(@PathVariable("categoryIdStr") String categoryIdStr, @PathVariable("isDel") int isDel,
                                                                               @PathVariable("orderOption") int orderOption, @PathVariable("userId") int userId,
                                                                               @RequestParam int page, @RequestParam int size){
        String[] s = categoryIdStr.split("_");
        List<Integer> categoryIdList=new ArrayList<>();
        for (String string : s) {
            if (string.isEmpty()) continue;
            int num;
            try {
                num = Integer.parseInt(string);
            } catch (NumberFormatException e) {
                continue;
            }
            if (num >= 0) categoryIdList.add(num);
        }

        if(categoryIdList.isEmpty() ||page<0||size<0||orderOption<=0||isDel<0||isDel>1) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        Page<TemplateDO> templatesByCategory = templateService.getPageByCategory(categoryIdList,isDel,orderOption,page,size);

        if(userId==0){
            List<TemplateVO> templateVOList = templatesByCategory.getContent()
                    .stream()
                    .map(templateDO -> convertToTemplateVO(templateDO, new ArrayList<>()))
                    .toList();
            return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByCategory.getTotalElements())));
        }
        List<Integer> templateIdsByUserStar = starService.getTemplateByUserStar(userId, 0);
        List<TemplateVO> templateVOList = templatesByCategory.getContent()
                .stream()
                .map(templateDO -> convertToTemplateVO(templateDO, templateIdsByUserStar))
                .toList();
        return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByCategory.getTotalElements())));
    }

    @GetMapping("/page/option/{nameLike}/{categoryIdStr}/{isDel}/{orderOption}/{userId}")
    public ResponseEntity<Message<Page<TemplateVO>>> getTemplatePageByOrder(@PathVariable("nameLike") String nameLike, @PathVariable("categoryIdStr") String categoryIdStr,
                                                                            @PathVariable("isDel") int isDel, @PathVariable("orderOption") int orderOption,
                                                                            @PathVariable("userId") int userId, @RequestParam int page, @RequestParam int size){
        List<Integer> categoryIdList = getCategoryList(categoryIdStr);

        if(categoryIdList.isEmpty() ||page<0||size<0||orderOption<=0||isDel<0||isDel>1||userId<0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        Page<TemplateDO> templatesByCategory = templateService.getPageByOption(nameLike, categoryIdList, isDel, orderOption, page, size);

        if(userId==0){
            List<TemplateVO> templateVOList = templatesByCategory.getContent()
                    .stream()
                    .map(templateDO -> convertToTemplateVO(templateDO, new ArrayList<>()))
                    .toList();
            return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByCategory.getTotalElements())));
        }
        List<Integer> templateIdsByUserStar = starService.getTemplateByUserStar(userId, 0);
        List<TemplateVO> templateVOList = templatesByCategory.getContent()
                .stream()
                .map(templateDO -> convertToTemplateVO(templateDO, templateIdsByUserStar))
                .toList();
        return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByCategory.getTotalElements())));
    }

    @GetMapping("/page/order/{order}/{isDel}/{userId}")
    public ResponseEntity<Message<Page<TemplateVO>>> getTemplatePageByOrder(@PathVariable("order") int order, @PathVariable("isDel") int isDel,
                                                                            @PathVariable("userId") int userId,
                                                                            @RequestParam int page, @RequestParam int size){

        if(page<0||size<=0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        Page<TemplateDO> res=null;
        if(order==1) res=templateService.getPageByIsDelOrderByCreateTimeAsc(isDel, page, size);
        else if (order==2) res=templateService.getPageByIsDelOrderByCreateTimeDesc(isDel, page, size);
        else if (order==3) res=templateService.getPageByIsDelOrderByDownloadAsc(isDel, page, size);
        else if (order==4) res=templateService.getPageByIsDelOrderByDownloadDesc(isDel, page, size);
        else if (order==5) res=templateService.getPageByIsDelOrderByUpdateTimeAsc(isDel, page, size);
        else if (order==6) res=templateService.getPageByIsDelOrderByUpdateTimeDesc(isDel, page, size);
        else if (order==7) res=templateService.getPageByIsDelOrderByStarAsc(isDel, page, size);
        else if (order==8) res=templateService.getPageByIsDelOrderByStarDesc(isDel, page, size);
        if(res==null) return getTemplatesByPage(isDel, userId, page, size);

        if(userId==0){
            List<TemplateVO> templateVOList = res.getContent()
                    .stream()
                    .map(templateDO -> convertToTemplateVO(templateDO, new ArrayList<>()))
                    .toList();
            return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), res.getTotalElements())));
        }
        List<Integer> templateIdsByUserStar = starService.getTemplateByUserStar(userId, 0);
        List<TemplateVO> templateVOList = res.getContent()
                .stream()
                .map(templateDO -> convertToTemplateVO(templateDO, templateIdsByUserStar))
                .toList();
        return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), res.getTotalElements())));
    }

    @GetMapping("/page/name/{name}/{isDel}/{orderOption}/{userId}")
    public ResponseEntity<Message<Page<TemplateVO>>> getPageByName(@PathVariable("name") String name, @PathVariable("isDel") int isDel,
                                                                   @PathVariable("orderOption") int orderOption, @PathVariable("userId") int userId,
                                                                   @RequestParam int page, @RequestParam int size){
        if(page<0||size<=0||orderOption<=0||isDel<0||isDel>1||userId<0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        if(name.isEmpty()) return getTemplatePageByOrder(orderOption, isDel, userId, page, size);
        Page<TemplateDO> templatesByCategory = templateService.getPageByNameLike(name,isDel,orderOption, page, size);

        if(userId==0){
            List<TemplateVO> templateVOList = templatesByCategory.getContent()
                    .stream()
                    .map(templateDO -> convertToTemplateVO(templateDO, new ArrayList<>()))
                    .toList();
            return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByCategory.getTotalElements())));
        }
        List<Integer> templateIdsByUserStar = starService.getTemplateByUserStar(userId, 0);
        List<TemplateVO> templateVOList = templatesByCategory.getContent()
                .stream()
                .map(templateDO -> convertToTemplateVO(templateDO, templateIdsByUserStar))
                .toList();
        return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByCategory.getTotalElements())));
    }

    @GetMapping("/page/user/{user}")
    public ResponseEntity<Message<Page<TemplateDO>>> getTemplatePageByUser(@PathVariable("user") int userId, @RequestParam int page, @RequestParam int size){
        if(userId==0||page<0||size<0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        Page<TemplateDO> templatePageByUserId = templateService.getPageByUserId(userId, page, size);
        return ResponseEntity.ok(Message.success(templatePageByUserId));
    }

    @GetMapping("/page/{isDel}/{userId}")
    public ResponseEntity<Message<Page<TemplateVO>>> getTemplatesByPage(@PathVariable("isDel") int isDel,
                                                                        @PathVariable("userId") int userId,
                                                                        @RequestParam int page, @RequestParam int size) {
        if(isDel<0||isDel>1||page<0||size<=0||userId<0) return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));

        Page<TemplateDO> templatesByPage = templateService.getTemplatesByPage(isDel, page, size);
        if(userId==0){
//            Page<TemplateDO> templatesByPage = templateService.getTemplatesByPage(isDel, page, size);
            List<TemplateVO> templateVOList = templatesByPage.getContent()
                    .stream()
                    .map(templateDO -> convertToTemplateVO(templateDO, new ArrayList<>()))
                    .toList();
            return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByPage.getTotalElements())));
        }
        List<Integer> templateIdsByUserStar = starService.getTemplateByUserStar(userId, 0);
//        Page<TemplateDO> templatesByPage = templateService.getTemplatesByPage(isDel, page, size);
        List<TemplateVO> templateVOList = templatesByPage.getContent()
                .stream()
                .map(templateDO -> convertToTemplateVO(templateDO, templateIdsByUserStar))
                .toList();
        return ResponseEntity.ok(Message.success(new PageImpl<>(templateVOList, PageRequest.of(page,size), templatesByPage.getTotalElements())));
    }

    private TemplateVO convertToTemplateVO(TemplateDO templateDO, List<Integer> ids) {

        return new TemplateVO(templateDO,ids.contains(templateDO.getId()));
    }

    @GetMapping("/download/{ownerId}/{templateId}/{version}/{versionId}")
    public ResponseEntity<Resource> download(@PathVariable("ownerId") Integer ownerId, @PathVariable("templateId") Integer templateId,
                                             @PathVariable("version") String version, @PathVariable("versionId") Integer versionId) {
        if (templateId == null || version == null || ownerId==null) throw new HertzbeatTemplateHubException("id empty");

        Resource resource = templateService.downloadTemplate(ownerId, templateId, version, versionId);
        if(resource!=null) return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + version + ".yml\"").body(resource);
        else return ResponseEntity.notFound().build();
    }

    @GetMapping("/download/latest/{ownerId}/{templateId}/{versionId}")
    public ResponseEntity<Resource> downloadLatest(@PathVariable("ownerId") Integer ownerId, @PathVariable("templateId") Integer templateId,
                                             @PathVariable("versionId") Integer versionId) {
        if (templateId == null ||  ownerId==null) throw new HertzbeatTemplateHubException("params error");

        VersionDO latestVersionDO = versionService.getLatestVersion(templateId);
        if(latestVersionDO ==null) throw new HertzbeatTemplateHubException("no version found");

        Resource resource = templateService.downloadTemplate(ownerId, templateId, latestVersionDO.getVersion(), versionId);
        if(resource!=null) return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + latestVersionDO.getVersion() + ".yml\"").body(resource);
        else return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/delete/{ownerId}/{templateId}/{version}")
    public ResponseEntity<Message<String>> deleteFile(@PathVariable("ownerId") Integer ownerId, @PathVariable("templateId") Integer templateId, @PathVariable("version") String version) {
        if (templateId == null || version == null || ownerId==null) return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));

        templateService.deleteTemplate(ownerId, templateId,version);
        return ResponseEntity.ok(Message.success("delete success"));
    }

    private static @NotNull List<Integer> getCategoryList(String categoryIdStr) {
        String[] categoryIdStrList = categoryIdStr.split("_");
        List<Integer> categoryIdList=new ArrayList<>();
        for (String string : categoryIdStrList) {
            if (string.isEmpty()) continue;
            int num;
            try {
                num = Integer.parseInt(string);
            } catch (NumberFormatException e) {
                continue;
            }
            if (num >= 0) categoryIdList.add(num);
        }
        return categoryIdList;
    }

    @GetMapping("/")
    public ResponseEntity<Message<List<TemplateDO>>> getAllTemplates(){

        List<TemplateDO> allTemplates = templateService.getAllTemplates();
        return ResponseEntity.ok(Message.success(allTemplates));
    }

    @PostMapping("/star")
    @Transactional
    public ResponseEntity<Message<String>> starVersion(@RequestParam("user") int userId,@RequestParam("template") int templateId){

        if(userId==0||templateId==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        boolean b = starService.assertTemplateIdIsStarByUser(userId, templateId);
        if(b){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Already star template"));
        }

        String nowTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        int isOk = starService.starTemplate(userId, templateId, nowTime);

        if(isOk==0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"star template error"));
        }

        boolean isOk3 = templateService.starTemplate(templateId);
        if(!isOk3){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"star template error"));
        }

        return ResponseEntity.ok(Message.success("star template success"));
    }

//    @Deprecated
//    @GetMapping("/query/{option}/{isDel}")
//    public ResponseEntity<Message<List<TemplateDO>>> getTemplateByOption(@PathVariable("option") int option,
//                                                                         @PathVariable("isDel") int isDel){
//        if(option<=0||isDel<0||isDel>1){
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));
//        }
//        List<TemplateDO> res=new ArrayList<>();
//        if(option==1){
//            res=templateService.getByIsDelOrderByCreateTimeAsc(isDel);
//        } else if (option==2) {
//            res=templateService.getByIsDelOrderByCreateTimeDesc(isDel);
//        }else if (option==3) {
//            res=templateService.getByIsDelOrderByDownloadAsc(isDel);
//        }else if (option==4) {
//            res=templateService.getByIsDelOrderByDownloadDesc(isDel);
//        }else if (option==5) {
//            res=templateService.getPageByIsDelOrderByUpdateTimeAsc(isDel);
//        } else if (option==6) {
//            res=templateService.getByIsDelOrderByUpdateTimeDesc(isDel);
//        }else if (option==7) {
//            res=templateService.getByIsDelOrderByStarAsc(isDel);
//        }else if (option==8) {
//            res=templateService.getByIsDelOrderByStarDesc(isDel);
//        }else {
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Params Error"));
//        }
//        if(res.isEmpty()){
//            return getAllTemplates();
//        }
//        return ResponseEntity.ok(Message.success(res));
//    }
//
//    @Deprecated
//    @GetMapping("/{user}")
//    public ResponseEntity<Message<List<TemplateDO>>> getTemplateByUser(@PathVariable("user") int userId){
//        if(userId==0){
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"User Error"));
//        }
//
//        return templateService.getAllTemplatesByUserId(userId);
//    }
//
//    @Deprecated
//    @GetMapping("/category/{categoryId}")
//    public ResponseEntity<Message<List<TemplateDO>>> getTemplateByCategory(@PathVariable("categoryId") int categoryId){
//        if(categoryId<=0){
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Error category"));
//        }
//
//        List<TemplateDO> templatesByCategory = templateService.getTemplatesByCategory(categoryId);
//
//        return ResponseEntity.ok(Message.success(templatesByCategory));
//    }
//
//    @Deprecated
//    @GetMapping("/name/{name}")
//    public ResponseEntity<Message<List<TemplateDO>>> getTemplateByName(@PathVariable("name") String name){
//        if(name.isEmpty()){
//            return getAllTemplates();
//        }
//
//        List<TemplateDO> templatesByCategory = templateService.getTemplatesByNameLike(name);
//
//        return ResponseEntity.ok(Message.success(templatesByCategory));
//    }
}
