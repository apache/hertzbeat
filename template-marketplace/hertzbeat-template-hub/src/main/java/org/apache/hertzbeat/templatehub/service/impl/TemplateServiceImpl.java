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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

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
    public boolean upload(TemplateDto templateDto, MultipartFile file) {

        Template template=new Template();
        template.setId(0);
        template.setName(templateDto.getName());
        template.setDescription(templateDto.getDescription());
        template.setLatest(0);
        template.setUser(templateDto.getUserId());
        template.setCategory(templateDto.getCategoryId());
        template.setTag(0);
        template.setDownload(0);
        template.setStar(0);
        template.setCreateTime(templateDto.getCreate_time());
        template.setUpdateTime(templateDto.getUpdate_time());
        template.setOffShelf(0);
        template.setIsDel(0);

        Version version=new Version();
        version.setId(0);
        version.setVersion(templateDto.getCurrentVersion());
        version.setDescription(templateDto.getDescriptionVersion());
        version.setDownload(0);
        version.setStar(0);
        version.setCreateTime(templateDto.getCreate_time());
        version.setOffShelf(0);
        version.setIsDel(0);

        int count = templateDao.queryCountByNameAndUser(template.getName(), template.getUser());
        if(count>=1){
            int id = templateDao.queryId(template.getName(), template.getUser());
            template.setId(id);
            int versionCount = versionDao.queryCountByTemplateAndVersion(id, templateDto.getCurrentVersion());
            if(versionCount>=1){
                throw new RuntimeException("You already have a same version");
            }
        }else{
            Template templateNew = templateDao.save(template);
            if(templateNew.getId()==0){
                throw new RuntimeException("Template data insertion error");
            }
            template=templateNew;
        }

        boolean isInsertVersion = versionService.insertVersion(version, template);

        if(!isInsertVersion){
            throw new RuntimeException("Version information insertion error");
        }

        String path=templateDto.getUserId()+"/"+template.getId();

        try {
            fileStorageService.uploadFile(file, path, templateDto.getCurrentVersion()+".yml");
        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        }

        return true;
    }

    @Deprecated
    @Override
    public ResponseEntity<Message<List<Template>>> getAllTemplatesByUserId(int userId) {

        List<Template> templates = templateDao.queryByUserId(userId, 0);

        return ResponseEntity.ok(Message.success(templates));
    }

    @Override
    public int getCountByIsDelAndOffShelf(int isDel, int offShelf) {

        return templateDao.queryCountByIsDelAndOffShelf(isDel, offShelf);
    }

    @Override
    public Page<Template> getPageByUserId(int userId, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByUserId(userId, 0,pageable);
    }

    @Deprecated
    @Override
    public List<Template> getTemplatesByCategory(int categoryId) {

        return templateDao.queryByCategory(categoryId, 0);
    }

    @Override
    public Page<Template> getPageByCategory(List<Integer> categoryIdList, int isDel, int orderOption, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        if(orderOption==1){
            return templateDao.queryPageByCategory(categoryIdList, isDel, pageable);
        }else{
            return templateDao.queryPageByCategory(categoryIdList, isDel, pageable);
        }
    }

    @Override
    public Page<Template> getPageByOption(String nameLike,List<Integer> categoryIdList, int isDel, int orderOption, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        if(nameLike.isEmpty()){
            if(orderOption==1){
                return templateDao.queryPageByCategory(categoryIdList, isDel, pageable);
            }else{
                return templateDao.queryPageByCategory(categoryIdList, isDel, pageable);
            }
        }else{
            if(orderOption==1){
                return templateDao.queryPageByNameLikeAndCategory(nameLike, categoryIdList, isDel, pageable);
            }else{
                return templateDao.queryPageByNameLikeAndCategory(nameLike, categoryIdList, isDel, pageable);
            }
        }

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

    @Override
    public Page<Template> getPageByIsDelOrderByStarDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByStarDesc(isDel,pageable);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByStarAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByStarAsc(isDel, pageable);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByDownloadDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByDownloadDesc(isDel,pageable);
    }

    @Override
    public Page<Template> getPageByIsDelOrderByDownloadAsc(int isDel, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByDownloadAsc(isDel, pageable);
    }

    @Override
    public Page<Template> getPageByNameLike(String name, int isDel, int orderOption, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        if(orderOption==1){
            return templateDao.queryPageByNameLike(isDel, name,pageable);
        }else{
            return templateDao.queryPageByNameLike(isDel, name,pageable);
        }
    }

    @Override
    public Page<Template> getTemplatesByPage(int isDel,int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDel(isDel, pageable);
    }

    @Override
    @Transactional
    public Resource downloadTemplate(int ownerId, int templateId, String version, int versionId) {

        if(templateId==0|| Objects.equals(version, "") ||ownerId==0){
            throw new IllegalArgumentException("id error");
        }

        String path=ownerId+"/"+templateId;
        String fileName=version+".yml";

        Resource file = fileStorageService.downloadFile(path, fileName);
        if(file==null){
            return null;
        }

        int isOk = templateDao.downloadUpdate(1,templateId);
        if(isOk==0){
            throw new RuntimeException("Template download error");
        }

        int isOk2 = versionDao.downloadUpdate(1,versionId);
        if(isOk2==0){
            throw new RuntimeException("Template download error");
        }

        return file;
    }

    @Override
    public boolean deleteTemplate(int ownerId, int templateId, String version) {

        String path=ownerId+"/"+templateId;
        fileStorageService.deleteFile(path,version+".yml");
        return true;
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

    @Deprecated
    @Override
    public ResponseEntity<Message<List<Template>>> getAllTemplates() {
        List<Template> templates = templateDao.queryAllByIsDel(0);

        return ResponseEntity.ok(Message.success(templates));
    }

    @Deprecated
    @Override
    public List<Template> getTemplatesByNameLike(String name) {

        return templateDao.queryByNameLike(0, name);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByDownloadAsc(int isDel) {
        return templateDao.getByIsDelOrderByDownloadAsc(isDel);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByStarAsc(int isDel) {
        return templateDao.getByIsDelOrderByStarAsc(isDel);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByDownloadDesc(int isDel) {
        return templateDao.getByIsDelOrderByDownloadDesc(isDel);
    }

    @Deprecated
    @Override
    public List<Template> getByIsDelOrderByStarDesc(int isDel) {
        return templateDao.getByIsDelOrderByStarDesc(isDel);
    }
}
