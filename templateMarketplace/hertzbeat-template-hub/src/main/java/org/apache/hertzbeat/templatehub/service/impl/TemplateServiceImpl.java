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

package org.apache.hertzbeat.templatehub.service.impl;

import org.apache.hertzbeat.templatehub.model.dao.TemplateDao;
import org.apache.hertzbeat.templatehub.model.dao.VersionDao;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.FileStorageService;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@Service
public class TemplateServiceImpl implements TemplateService {

    @Autowired
    VersionService versionService;

    @Autowired
    TemplateDao templateDao;

    @Autowired
    VersionDao versionDao;

    private final FileStorageService fileStorageService;

    @Autowired
    public TemplateServiceImpl(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    @Override
    public ResponseEntity<Message<Object>> upload(TemplateDto templateDto, MultipartFile file) {

        if(templateDto.getUserId()==0||templateDto.getName().isEmpty()||templateDto.getCurrentVersion().isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template description information is missing"));
        }

        //Generate Template entity
        Template template=new Template();
        template.setId(0);
        template.setName(templateDto.getName());
        template.setDescription(templateDto.getDescription());
        template.setLatest(0);
        template.setUser(templateDto.getUserId());
        template.setCategory(templateDto.getCategoryId());
        template.setTag(0);
        template.setDownload(0);
        template.setCreateTime(templateDto.getCreate_time());
        template.setUpdateTime(templateDto.getUpdate_time());
        template.setOffShelf(0);
        template.setIsDel(0);

        //Generate version entity
        Version version=new Version();
        version.setId(0);
        version.setVersion(templateDto.getCurrentVersion());
        version.setDescription(templateDto.getDescriptionVersion());
        version.setDownload(0);
        version.setCreateTime(templateDto.getCreate_time());
        version.setOffShelf(0);
        version.setIsDel(0);

        //Check if the same user already has a configuration with the same name
        int count = templateDao.queryCountByNameAndUser(template.getName(), template.getUser());
        //If there is already template data with the same name, consider whether to add new version data
        if(count>=1){
            int id = templateDao.queryId(template.getName(), template.getUser());
            template.setId(id);
            //Check the version table of this template to see if there are any duplicate versions
            int versionCount = versionDao.queryCountByTemplateAndVersion(id, templateDto.getCurrentVersion());
            if(versionCount>=1){
                return ResponseEntity.ok(Message.fail(FAIL_CODE,"You already have a template with the same name and version number"));
            }
        }else{  //If there is no template data with the same name, add template data first and then consider whether to add version data
            Template templateNew = templateDao.save(template);
            if(templateNew.getId()==0){
//                return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template data insertion error"));
                throw new RuntimeException("Template data insertion error");
            }
        }

        //Insert version information
        boolean isInsertVersion = versionService.insertVersion(version, template);

        if(!isInsertVersion){
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Version information insertion error"));
            throw new RuntimeException("Version information insertion error");
        }

        // Build the storage path of the file in MinIO, path=user id/template id/version number. yml
        String path=templateDto.getUserId()+"/"+template.getId();

        try {
//            minIOConfigService.uploadFile(file,path);
            fileStorageService.uploadFile(file, path, templateDto.getCurrentVersion()+".yml");
        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        }

        return ResponseEntity.ok(Message.success());
    }

    @Deprecated
    @Override
    public ResponseEntity<Message<List<Template>>> getAllTemplatesByUserId(int userId) {

        // Query all templates of a user that have not been deleted
        List<Template> templates = templateDao.queryByUserId(userId, 0);

        return ResponseEntity.ok(Message.success(templates));
    }

    /**
     * 根据用户id分页查询模版信息
     * @param userId 用户id
     * @return 分页信息
     */
    @Override
    public Page<Template> getPageByUserId(int userId, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        // Query all templates of a user that have not been deleted
        return templateDao.queryPageByUserId(userId, 0,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getTemplatesByCategory(int categoryId) {

        return templateDao.queryByCategory(categoryId, 0);
    }

    @Override
    public Page<Template> getPageByCategory(int categoryId, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        return templateDao.queryPageByCategory(categoryId, 0, pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByCreateTimeDesc(int isDel) {

        return templateDao.queryAllByIsDelOrderByCreateTimeDesc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByCreateTimeDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByCreateTimeDesc(isDel,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByCreateTimeAsc(int isDel) {
        return templateDao.queryAllByIsDelOrderByCreateTimeAsc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByCreateTimeAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByCreateTimeAsc(isDel,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByUpdateTimeDesc(int isDel) {
        return templateDao.getByIsDelOrderByUpdateTimeDesc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByUpdateTimeDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByUpdateTimeDesc(isDel,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getPageByIsDelOrderByUpdateTimeAsc(int isDel) {
        return templateDao.getByIsDelOrderByUpdateTimeAsc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByUpdateTimeAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByUpdateTimeAsc(isDel,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByStarDesc(int isDel) {
        return templateDao.getByIsDelOrderByStarDesc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByStarDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByStarDesc(isDel,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByStarAsc(int isDel) {
        return templateDao.getByIsDelOrderByStarAsc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByStarAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByStarAsc(isDel, pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByDownloadDesc(int isDel) {
        return templateDao.getByIsDelOrderByDownloadDesc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByDownloadDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByDownloadDesc(isDel,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByDownloadAsc(int isDel) {
        return templateDao.getByIsDelOrderByDownloadAsc(isDel);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByDownloadAsc(int isDel, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByDownloadAsc(isDel, pageable);
    }

    @Deprecated
    @Override
    public List<Template> getTemplatesByNameLike(String name) {

        return templateDao.queryByNameLike(0, name);
    }

    @Override
    public Page<Template> getPageByNameLike(String name, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByNameLike(0, name,pageable);
    }

    @Deprecated
    @Override
    public ResponseEntity<Message<List<Template>>> getAllTemplates() {

        // Query all templates that have not been deleted
        List<Template> templates = templateDao.queryAllByIsDel(0);

        return ResponseEntity.ok(Message.success(templates));
    }

    @Override
    public Page<Template> getTemplatesByPage(int isDel,int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDel(isDel, pageable);
    }

    /**
     * Download the template, generate an external link and send it to the frontend
     *
     * @param version version Name
     */
    @Override
    @Transactional
    public ResponseEntity<Resource> downloadTemplate(int ownerId, int templateId, String version, int versionId) {

        if(templateId==0|| Objects.equals(version, "") ||ownerId==0){
            throw new IllegalArgumentException("id error");
        }

        String path=ownerId+"/"+templateId;
        String fileName=version+".yml";

        Resource file = fileStorageService.downloadFile(path, fileName);
        if(file==null){
            return ResponseEntity.notFound().build();
        }

        int isOk = templateDao.downloadUpdate(1,templateId);
        if(isOk==0){
            throw new RuntimeException("Template download error");
        }

        int isOk2 = versionDao.downloadUpdate(1,versionId);
        if(isOk2==0){
            throw new RuntimeException("Template download error");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(file);
    }

    @Override
    public ResponseEntity<Message<String>> deleteTemplate(int ownerId, int templateId, String version) {
        //todo Perform database operations

        String path=ownerId+"/"+templateId;
        fileStorageService.deleteFile(path,version+".yml");
        return null;
    }

    @Override
    public Template getTemplate(int templateId) {
        return templateDao.findTemplateById(templateId);
    }

    @Override
    public boolean starTemplate(int templateId) {
        Optional<Template> byId = templateDao.findById(templateId);
        if(byId.isEmpty()){
            return false;
        }
        Template template = byId.get();
        template.setStar(template.getStar() + 1);
        templateDao.save(template);

        return true;
    }

    @Override
    public boolean cancelStarTemplate(int templateId) {
        int i = templateDao.cancelStarTemplate(1, templateId);
        return i == 1;
    }


}
