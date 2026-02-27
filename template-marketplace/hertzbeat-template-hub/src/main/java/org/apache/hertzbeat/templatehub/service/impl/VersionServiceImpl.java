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
import org.apache.hertzbeat.templatehub.model.DAO.StarDao;
import org.apache.hertzbeat.templatehub.model.DAO.TemplateDao;
import org.apache.hertzbeat.templatehub.model.DAO.VersionDao;
import org.apache.hertzbeat.templatehub.model.DO.VersionDO;
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.service.FileStorageService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class VersionServiceImpl implements VersionService {

    @Autowired
    VersionDao versionDao;

    @Autowired
    TemplateDao templateDao;

    @Autowired
    StarDao starDao;

    private final FileStorageService fileStorageService;

    @Autowired
    public VersionServiceImpl(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @Override
    public boolean insertVersion(VersionDO versionDO, TemplateDO templateDO) {

        versionDO.setTemplateId(templateDO.getId());

        VersionDO insertVersionDO = versionDao.save(versionDO);
        if(insertVersionDO.getId()==0){
            return false;
        }

        //Update the latest version in the template file data table
        int versionId= insertVersionDO.getId();
        templateDO.setLatest(versionId);
        int updateTemplate = templateDao.updateTemplate(templateDO.getLatest(), templateDO.getId());

        return updateTemplate == 1;
    }

    @Deprecated
    @Override
    public List<VersionDO> getVersions(int templateId) {

        return versionDao.queryVersionByTemplateId(templateId);
    }

    @Override
    public Page<VersionDO> getVersionPageByTemplate(int templateId, int isDel, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        return versionDao.queryPageByTemplateId(templateId, isDel, pageable);
    }

    @Transactional
    @Override
    public boolean upload(TemplateDto templateDto, MultipartFile file) {
        //Generate Template entity
        TemplateDO templateDO =templateDao.findTemplateById(templateDto.getId());

        //Generate version entity
        VersionDO versionDO =new VersionDO();
        versionDO.setId(0);
        versionDO.setVersion(templateDto.getCurrentVersion());
        versionDO.setDescription(templateDto.getDescriptionVersion());
        versionDO.setDownload(0);
        versionDO.setCreateTime(templateDto.getCreate_time());
        versionDO.setOffShelf(0);
        versionDO.setIsDel(0);


        //Check the version table of this template to see if there are any duplicate versions
        int versionCount = versionDao.queryCountByTemplateAndVersion(templateDO.getId(), templateDto.getCurrentVersion());
        if(versionCount>=1){
            throw new HertzbeatTemplateHubException("same version");
        }

        //Insert version information
        boolean isInsertVersion = insertVersion(versionDO, templateDO);

        if(!isInsertVersion){
            throw new HertzbeatTemplateHubException("Version information insertion error");
        }

        String path=templateDto.getUserId()+"/"+ templateDO.getId();

        try {
            fileStorageService.uploadFile(file, path, templateDto.getCurrentVersion()+".yml");
        } catch (RuntimeException e) {
            throw new HertzbeatTemplateHubException(e.getMessage());
        }

        return true;
    }

    @Override
    public VersionDO getVersion(int versionId) {
        Optional<VersionDO> byId = versionDao.findById(versionId);
        return byId.orElse(null);
    }

    @Override
    public VersionDO getLatestVersion(int templateId) {
        return versionDao.queryLatestByTemplate(templateId);
    }

//    @Override
//    public boolean startVersion(int versionId) {
//
//        Optional<Version> byId = versionDao.findById(versionId);
//        if(byId.isEmpty()){
//            return false;
//        }
//        Version version = byId.get();
//        version.setStar(version.getStar() + 1);
//        versionDao.save(version);
//
//        return true;
//    }

//    @Override
//    public int cancelStarVersion(int versionId) {
//        Optional<Version> byId = versionDao.findById(versionId);
//        if(byId.isEmpty()){
//            return 0;
//        }
//        int i = versionDao.cancelStarVersion(1, versionId);
//        if(i!=1){
//            return 0;
//        }
//        return byId.get().getTemplateId();
//    }
}
