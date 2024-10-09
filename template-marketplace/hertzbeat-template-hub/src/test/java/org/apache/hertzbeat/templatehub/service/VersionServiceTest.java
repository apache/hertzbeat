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
import org.apache.hertzbeat.templatehub.model.dao.VersionDao;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.impl.MinIOFileStorageServiceImpl;
import org.apache.hertzbeat.templatehub.service.impl.VersionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test case for {@link VersionService}
 */
@ExtendWith(MockitoExtension.class)
class VersionServiceTest {

    @Mock
    private VersionDao versionDao;

    @Mock
    private TemplateDao templateDao;

    @InjectMocks
    private VersionServiceImpl versionService;

    @Mock
    private MinIOFileStorageServiceImpl fileStorageService;


    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testInsertVersion_Success() {
        Version version = new Version();
        version.setId(1);
        Template template = new Template();
        template.setId(1);

        when(versionDao.save(any(Version.class))).thenReturn(version);
        when(templateDao.updateTemplate(version.getId(), template.getId())).thenReturn(1);

        boolean result = versionService.insertVersion(version, template);

        assertTrue(result);
        verify(versionDao).save(version);
        verify(templateDao).updateTemplate(version.getId(), template.getId());
    }

    @Test
    void testInsertVersion_Failure() {
        Version version = new Version();
        version.setId(0);
        Template template = new Template();
        template.setId(1);

        when(versionDao.save(any(Version.class))).thenReturn(version);

        boolean result = versionService.insertVersion(version, template);

        assertFalse(result);
        verify(versionDao).save(version);
        verify(templateDao, never()).updateTemplate(anyInt(), anyInt());
    }

    @Test
    @Transactional
    void testUpload_Success() {
        TemplateDto templateDto = new TemplateDto();
        templateDto.setUserId(1);
        templateDto.setId(1);
        templateDto.setCurrentVersion("1.0");
        templateDto.setDescriptionVersion("Initial version");

        MultipartFile file = mock(MultipartFile.class);
        Template template = new Template();
        template.setId(1);

        Version mockVersion = new Version();
        mockVersion.setId(1);

        when(templateDao.findTemplateById(templateDto.getId())).thenReturn(template);
        when(versionDao.queryCountByTemplateAndVersion(template.getId(), templateDto.getCurrentVersion())).thenReturn(0);
        when(versionDao.save(any(Version.class))).thenReturn(mockVersion);
        when(templateDao.updateTemplate(anyInt(), anyInt())).thenReturn(1);
//        doNothing().when(fileStorageService).uploadFile(any(MultipartFile.class),anyString(),anyString());

        boolean response = versionService.upload(templateDto, file);

        assertTrue(response);
//        verify(fileStorageService,times(1)).uploadFile(file,templateDto.getUserId()+"/"+template.getId(),templateDto.getCurrentVersion()+".yml");
    }

    @Test
    void testGetVersion_Success() {
        int versionId = 1;
        Version version = new Version();
        version.setId(versionId);

        when(versionDao.findById(versionId)).thenReturn(Optional.of(version));

        Version result = versionService.getVersion(versionId);

        assertNotNull(result);
        assertEquals(versionId, result.getId());
        verify(versionDao).findById(versionId);
    }

    @Test
    void testGetVersion_NotFound() {
        int versionId = 1;

        when(versionDao.findById(versionId)).thenReturn(Optional.empty());

        Version result = versionService.getVersion(versionId);

        assertNull(result);
        verify(versionDao).findById(versionId);
    }

    @Test
    void testGetLatestVersion() {
        int templateId = 1;
        Version version = new Version();
        version.setId(1);

        when(versionDao.queryLatestByTemplate(templateId)).thenReturn(version);

        Version result = versionService.getLatestVersion(templateId);

        assertNotNull(result);
        assertEquals(1, result.getId());
        verify(versionDao).queryLatestByTemplate(templateId);
    }

    @Test
    void testStartVersion() {
        int versionId = 1;
        Version version = new Version();
        version.setId(versionId);
        version.setStar(0);

        when(versionDao.findById(versionId)).thenReturn(Optional.of(version));

        boolean result = versionService.startVersion(versionId);

        assertTrue(result);
        assertEquals(1, version.getStar());
        verify(versionDao).findById(versionId);
        verify(versionDao).save(version);
    }

    @Test
    void testStartVersion_NotFound() {
        int versionId = 1;

        when(versionDao.findById(versionId)).thenReturn(Optional.empty());

        boolean result = versionService.startVersion(versionId);

        assertFalse(result);
        verify(versionDao).findById(versionId);
        verify(versionDao, never()).save(any(Version.class));
    }

    @Test
    void testCancelStarVersion() {
        int versionId = 1;
        Version version = new Version();
        version.setId(versionId);
        version.setStar(1);
        version.setTemplate(1);

        when(versionDao.cancelStarVersion(1, versionId)).thenReturn(1);
        when(versionDao.findById(versionId)).thenReturn(Optional.of(version));

        int templateId = versionService.cancelStarVersion(versionId);

        assertEquals(1, templateId);
        verify(versionDao).cancelStarVersion(1, versionId);
        verify(versionDao).findById(versionId);
    }

    @Test
    void testCancelStarVersion_NotFound() {
        int versionId = 1;

        when(versionDao.findById(versionId)).thenReturn(Optional.empty());

        int res = versionService.cancelStarVersion(versionId);

        assertEquals(0, res);
        verify(versionDao).findById(versionId);
    }
}