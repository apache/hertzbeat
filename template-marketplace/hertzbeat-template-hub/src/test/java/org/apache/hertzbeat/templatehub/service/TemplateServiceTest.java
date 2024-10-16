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

import org.apache.hertzbeat.templatehub.model.dao.TemplateDao;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.impl.MinIOFileStorageServiceImpl;
import org.apache.hertzbeat.templatehub.service.impl.TemplateServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test case for {@link TemplateService}
 */
@ExtendWith(MockitoExtension.class)
class TemplateServiceTest {

    @InjectMocks
    private TemplateServiceImpl templateService;

    @Mock
    private TemplateDao templateDao;

    @Mock
    private VersionService versionService;

    @Mock
    private MinIOFileStorageServiceImpl fileStorageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testUpload() {
        TemplateDto templateDto = new TemplateDto();
        templateDto.setId(20);
        templateDto.setName("Sample Template");
        templateDto.setUserId(1);
        templateDto.setCurrentVersion("1.0");
        templateDto.setCreate_time("2024-09-28T10:00:00");
        templateDto.setUpdate_time("2024-09-28T10:00:00");

        Template template = new Template();
        template.setId(templateDto.getId());
        template.setName(templateDto.getName());
        template.setDescription(templateDto.getDescription());
        template.setUser(templateDto.getUserId());
        template.setCreateTime(templateDto.getCreate_time());
        template.setUpdateTime(templateDto.getUpdate_time());
        template.setLatest(10);
        template.setIsDel(0);

        MultipartFile file = mock(MultipartFile.class);

        when(templateDao.queryCountByNameAndUser(anyString(), anyInt())).thenReturn(0);
        when(templateDao.save(any(Template.class))).thenReturn(template);

        when(versionService.insertVersion(any(Version.class), any(Template.class))).thenReturn(true);

        boolean result = templateService.upload(templateDto, file);

        verify(templateDao).save(any(Template.class));
        verify(versionService,times(1)).insertVersion(any(Version.class), any(Template.class));
        assertTrue(result);
    }

    @Test
    void testGetCountByIsDelAndOffShelf() {
        int isDel = 0;
        int offShelf = 0;
        when(templateDao.queryCountByIsDelAndOffShelf(isDel, offShelf)).thenReturn(5);

        int count = templateService.getCountByIsDelAndOffShelf(isDel, offShelf);

        assertEquals(5, count);
        verify(templateDao).queryCountByIsDelAndOffShelf(isDel, offShelf);
    }

    @Test
    void testGetPageByUserId() {
        int userId = 1;
        int page = 0;
        int size = 10;
        Pageable pageable = PageRequest.of(page, size);
        List<Template> templates = List.of(new Template(), new Template());
        Page<Template> templatePage = new PageImpl<>(templates, pageable, templates.size());

        when(templateDao.queryPageByUserId(userId, 0, pageable)).thenReturn(templatePage);

        Page<Template> result = templateService.getPageByUserId(userId, page, size);

        assertEquals(2, result.getContent().size());
        verify(templateDao).queryPageByUserId(userId, 0, pageable);
    }

    @Test
    void testGetPageByCategory() {
        List<Integer> categoryIdList = List.of(1, 2);
        int isDel = 0;
        int orderOption = 1;
        int page = 0;
        int size = 10;
        Pageable pageable = PageRequest.of(page, size);
        List<Template> templates = List.of(new Template(), new Template());
        Page<Template> templatePage = new PageImpl<>(templates, pageable, templates.size());

        when(templateDao.queryPageByCategory(categoryIdList, isDel, pageable)).thenReturn(templatePage);

        Page<Template> result = templateService.getPageByCategory(categoryIdList, isDel, orderOption, page, size);

        assertEquals(2, result.getContent().size());
        verify(templateDao).queryPageByCategory(categoryIdList, isDel, pageable);
    }

    @Test
    void testGetPageByIsDelOrderByCreateTimeDesc() {
        int isDel = 0;
        int page = 0;
        int size = 10;
        Pageable pageable = PageRequest.of(page, size);
        List<Template> templates = List.of(new Template(), new Template());
        Page<Template> templatePage = new PageImpl<>(templates, pageable, templates.size());

        when(templateDao.queryPageByIsDelOrderByCreateTimeDesc(isDel, pageable)).thenReturn(templatePage);

        Page<Template> result = templateService.getPageByIsDelOrderByCreateTimeDesc(isDel, page, size);

        assertEquals(2, result.getContent().size());
        verify(templateDao).queryPageByIsDelOrderByCreateTimeDesc(isDel, pageable);
    }

    @Test
    void testGetTemplate() {
        int templateId = 1;
        Template template = new Template();
        when(templateDao.findTemplateById(templateId)).thenReturn(template);

        Template result = templateService.getTemplate(templateId);

        assertNotNull(result);
        verify(templateDao).findTemplateById(templateId);
    }

    @Test
    void testStarTemplate() {
        int templateId = 1;
        Template template = new Template();
        template.setStar(0);
        when(templateDao.findById(templateId)).thenReturn(Optional.of(template));

        boolean result = templateService.starTemplate(templateId);

        assertTrue(result);
        assertEquals(1, template.getStar());
        verify(templateDao).save(template);
    }

    @Test
    void testCancelStarTemplate() {
        int templateId = 1;
        when(templateDao.cancelStarTemplate(1, templateId)).thenReturn(1);

        boolean result = templateService.cancelStarTemplate(templateId);

        assertTrue(result);
        verify(templateDao).cancelStarTemplate(1, templateId);
    }
}