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

import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TemplateService {

    ResponseEntity<Message<Object>> upload(TemplateDto templateDto, MultipartFile file);

    @Deprecated
    ResponseEntity<Message<List<Template>>> getAllTemplatesByUserId(int userId);

    Page<Template> getPageByUserId(int userId, int page, int size);

    @Deprecated
    List<Template> getTemplatesByCategory(int categoryId);

    Page<Template> getPageByCategory(int categoryId, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByCreateTimeDesc(int isDel);

    Page<Template> getPageByIsDelOrderByCreateTimeDesc(int isDel, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByCreateTimeAsc(int isDel);

    Page<Template> getPageByIsDelOrderByCreateTimeAsc(int isDel, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByUpdateTimeDesc(int isDel);

    Page<Template> getPageByIsDelOrderByUpdateTimeDesc(int isDel, int page, int size);

    @Deprecated
    List<Template> getPageByIsDelOrderByUpdateTimeAsc(int isDel);

    Page<Template> getPageByIsDelOrderByUpdateTimeAsc(int isDel, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByStarDesc(int isDel);

    Page<Template> getPageByIsDelOrderByStarDesc(int isDel, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByStarAsc(int isDel);

    Page<Template> getPageByIsDelOrderByStarAsc(int isDel, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByDownloadDesc(int isDel);

    Page<Template> getPageByIsDelOrderByDownloadDesc(int isDel, int page, int size);

    @Deprecated
    List<Template> getByIsDelOrderByDownloadAsc(int isDel);

    Page<Template> getPageByIsDelOrderByDownloadAsc(int isDel, int page, int size);

    @Deprecated
    List<Template> getTemplatesByNameLike(String name);

    Page<Template> getPageByNameLike(String name, int page, int size);

    @Deprecated
    ResponseEntity<Message<List<Template>>> getAllTemplates();

    Page<Template> getTemplatesByPage(int isDel, int page, int size);

    ResponseEntity<Resource> downloadTemplate(int ownerId, int templateId, String version, int versionId);

    ResponseEntity<Message<String>> deleteTemplate(int ownerId, int templateId, String version);

    Template getTemplate(int templateId);

    boolean starTemplate(int templateId);

    boolean cancelStarTemplate(int templateId);
}
