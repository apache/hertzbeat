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

import org.apache.hertzbeat.templatehub.exception.HertzbeatTemplateHubException;
import org.apache.hertzbeat.templatehub.model.DAO.TemplateDao;
import org.apache.hertzbeat.templatehub.model.DAO.VersionDao;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.model.DO.VersionDO;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
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

        TemplateDO templateDO =new TemplateDO();
        templateDO.setId(0);
        templateDO.setName(templateDto.getName());
        templateDO.setDescription(templateDto.getDescription());
        templateDO.setLatest(0);
        templateDO.setUser(templateDto.getUserId());
        templateDO.setCategoryId(templateDto.getCategoryId());
        templateDO.setTag(0);
        templateDO.setDownload(0);
        templateDO.setStar(0);
        templateDO.setCreateTime(templateDto.getCreate_time());
        templateDO.setUpdateTime(templateDto.getUpdate_time());
        templateDO.setOffShelf(0);
        templateDO.setIsDel(0);

        VersionDO versionDO =new VersionDO();
        versionDO.setId(0);
        versionDO.setVersion(templateDto.getCurrentVersion());
        versionDO.setDescription(templateDto.getDescriptionVersion());
        versionDO.setDownload(0);
        versionDO.setStar(0);
        versionDO.setCreateTime(templateDto.getCreate_time());
        versionDO.setOffShelf(0);
        versionDO.setIsDel(0);

        int count = templateDao.queryCountByNameAndUser(templateDO.getName(), templateDO.getUser());
        if(count>=1){
            int id = templateDao.queryId(templateDO.getName(), templateDO.getUser());
            templateDO.setId(id);
            int versionCount = versionDao.queryCountByTemplateAndVersion(id, templateDto.getCurrentVersion());
            if(versionCount>=1){
                throw new HertzbeatTemplateHubException("You already have a same version");
            }
        }else{
            TemplateDO templateDONew = templateDao.save(templateDO);
            if(templateDONew.getId()==0){
                throw new HertzbeatTemplateHubException("Template data insertion error");
            }
            templateDO = templateDONew;
        }

        boolean isInsertVersion = versionService.insertVersion(versionDO, templateDO);

        if(!isInsertVersion){
            throw new HertzbeatTemplateHubException("Version information insertion error");
        }

        String path=templateDto.getUserId()+"/"+ templateDO.getId();

        try {
            fileStorageService.uploadFile(file, path, templateDto.getCurrentVersion()+".yml");
        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        }

        return true;
    }

    @Override
    public int getCountByIsDelAndOffShelf(int isDel, int offShelf) {

        return templateDao.queryCountByIsDelAndOffShelf(isDel, offShelf);
    }

    @Override
    public Page<TemplateDO> getPageByUserId(int userId, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByUserId(userId, 0,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByCategory(List<Integer> categoryIdList, int isDel, int orderOption, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        if(orderOption==1){
            return templateDao.queryPageByCategory(categoryIdList, isDel, pageable);
        }else{
            return templateDao.queryPageByCategory(categoryIdList, isDel, pageable);
        }
    }

    @Override
    public Page<TemplateDO> getPageByOption(String nameLike, List<Integer> categoryIdList, int isDel, int orderOption, int page, int size) {
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

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByCreateTimeDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByCreateTimeDesc(isDel,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByCreateTimeAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByCreateTimeAsc(isDel,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByUpdateTimeDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByUpdateTimeDesc(isDel,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByUpdateTimeAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByUpdateTimeAsc(isDel,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByStarDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByStarDesc(isDel,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByStarAsc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByStarAsc(isDel, pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByDownloadDesc(int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByDownloadDesc(isDel,pageable);
    }

    @Override
    public Page<TemplateDO> getPageByIsDelOrderByDownloadAsc(int isDel, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDelOrderByDownloadAsc(isDel, pageable);
    }

    @Override
    public Page<TemplateDO> getPageByNameLike(String name, int isDel, int orderOption, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        if(orderOption==1){
            return templateDao.queryPageByNameLike(isDel, name,pageable);
        }else{
            return templateDao.queryPageByNameLike(isDel, name,pageable);
        }
    }

    @Override
    public Page<TemplateDO> getTemplatesByPage(int isDel, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return templateDao.queryPageByIsDel(isDel, pageable);
    }

    @Override
    @Transactional
    public Resource downloadTemplate(int ownerId, int templateId, String version, int versionId) {

        if(templateId==0|| Objects.equals(version, "") ||ownerId==0) throw new IllegalArgumentException("id error");

        String path=ownerId+"/"+templateId;
        String fileName=version+".yml";

        Resource file = fileStorageService.downloadFile(path, fileName);
        if(file==null) return null;

        int isOk = templateDao.downloadUpdate(1,templateId);
        if(isOk==0) throw new HertzbeatTemplateHubException("Template download error");

        int isOk2 = versionDao.downloadUpdate(1,versionId);
        if(isOk2==0) throw new HertzbeatTemplateHubException("Template download error");

        return file;
    }

    @Override
    public boolean deleteTemplate(int ownerId, int templateId, String version) {

        String path=ownerId+"/"+templateId;
        fileStorageService.deleteFile(path,version+".yml");
        return true;
    }

    @Override
    public TemplateDO getTemplate(int templateId) {
        return templateDao.findTemplateById(templateId);
    }

    @Override
    public boolean starTemplate(int templateId) {
        Optional<TemplateDO> byId = templateDao.findById(templateId);
        if(byId.isEmpty()){
            return false;
        }
        TemplateDO templateDO = byId.get();
        templateDO.setStar(templateDO.getStar() + 1);
        templateDao.save(templateDO);

        return true;
    }

    @Override
    public boolean cancelStarTemplate(int templateId) {
        int i = templateDao.cancelStarTemplate(1, templateId);
        return i == 1;
    }

    @Override
    public List<TemplateDO> getAllTemplates() {

        return templateDao.queryAllByIsDel(0);
    }

//    @Deprecated
//    @Override
//    public ResponseEntity<Message<List<TemplateDO>>> getAllTemplatesByUserId(int userId) {
//
//        List<TemplateDO> templateDOS = templateDao.queryByUserId(userId, 0);
//
//        return ResponseEntity.ok(Message.success(templateDOS));
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getTemplatesByCategory(int categoryId) {
//
//        return templateDao.queryByCategory(categoryId, 0);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByCreateTimeDesc(int isDel) {
//
//        return templateDao.queryAllByIsDelOrderByCreateTimeDesc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByCreateTimeAsc(int isDel) {
//        return templateDao.queryAllByIsDelOrderByCreateTimeAsc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getPageByIsDelOrderByUpdateTimeAsc(int isDel) {
//        return templateDao.getByIsDelOrderByUpdateTimeAsc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByUpdateTimeDesc(int isDel) {
//        return templateDao.getByIsDelOrderByUpdateTimeDesc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getTemplatesByNameLike(String name) {
//
//        return templateDao.queryByNameLike(0, name);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByDownloadAsc(int isDel) {
//        return templateDao.getByIsDelOrderByDownloadAsc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByStarAsc(int isDel) {
//        return templateDao.getByIsDelOrderByStarAsc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByDownloadDesc(int isDel) {
//        return templateDao.getByIsDelOrderByDownloadDesc(isDel);
//    }
//
//    @Deprecated
//    @Override
//    public List<TemplateDO> getByIsDelOrderByStarDesc(int isDel) {
//        return templateDao.getByIsDelOrderByStarDesc(isDel);
//    }
}
