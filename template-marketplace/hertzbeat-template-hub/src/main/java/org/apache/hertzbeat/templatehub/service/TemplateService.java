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

package org.apache.hertzbeat.templatehub.service;

import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TemplateService {

    int getCountByIsDelAndOffShelf(int isDel, int offShelf);

    boolean upload(TemplateDto templateDto, MultipartFile file);

    Page<TemplateDO> getPageByUserId(int userId, int page, int size);

    Page<TemplateDO> getPageByCategory(List<Integer> categoryIdList, int isDel, int orderOption, int page, int size);

    Page<TemplateDO> getPageByOption(String nameLike, List<Integer> categoryIdList, int isDel, int orderOption, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByCreateTimeDesc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByCreateTimeAsc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByUpdateTimeDesc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByUpdateTimeAsc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByStarDesc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByStarAsc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByDownloadDesc(int isDel, int page, int size);

    Page<TemplateDO> getPageByIsDelOrderByDownloadAsc(int isDel, int page, int size);

    Page<TemplateDO> getPageByNameLike(String name, int isDel, int orderOption, int page, int size);

    Page<TemplateDO> getTemplatesByPage(int isDel, int page, int size);

    Resource downloadTemplate(int ownerId, int templateId, String version, int versionId);

    boolean deleteTemplate(int ownerId, int templateId, String version);

    TemplateDO getTemplate(int templateId);

    boolean starTemplate(int templateId);

    boolean cancelStarTemplate(int templateId);

    List<TemplateDO> getAllTemplates();

//    @Deprecated
//    List<TemplateDO> getTemplatesByCategory(int categoryId);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByCreateTimeDesc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByCreateTimeAsc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByUpdateTimeDesc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getPageByIsDelOrderByUpdateTimeAsc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByStarDesc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByStarAsc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByDownloadDesc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getByIsDelOrderByDownloadAsc(int isDel);
//
//    @Deprecated
//    List<TemplateDO> getTemplatesByNameLike(String name);
//
//    @Deprecated
//    ResponseEntity<Message<List<TemplateDO>>> getAllTemplatesByUserId(int userId);
}
