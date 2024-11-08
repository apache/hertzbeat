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

import org.apache.hertzbeat.templatehub.model.DAO.TemplateDao;
import org.apache.hertzbeat.templatehub.model.DAO.VersionDao;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.model.DO.VersionDO;
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
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
class VersionDOServiceTest {

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
        VersionDO versionDO = new VersionDO();
        versionDO.setId(1);
        TemplateDO templateDO = new TemplateDO();
        templateDO.setId(1);

        when(versionDao.save(any(VersionDO.class))).thenReturn(versionDO);
        when(templateDao.updateTemplate(versionDO.getId(), templateDO.getId())).thenReturn(1);

        boolean result = versionService.insertVersion(versionDO, templateDO);

        assertTrue(result);
        verify(versionDao).save(versionDO);
        verify(templateDao).updateTemplate(versionDO.getId(), templateDO.getId());
    }

    @Test
    void testInsertVersion_Failure() {
        VersionDO versionDO = new VersionDO();
        versionDO.setId(0);
        TemplateDO templateDO = new TemplateDO();
        templateDO.setId(1);

        when(versionDao.save(any(VersionDO.class))).thenReturn(versionDO);

        boolean result = versionService.insertVersion(versionDO, templateDO);

        assertFalse(result);
        verify(versionDao).save(versionDO);
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
        TemplateDO templateDO = new TemplateDO();
        templateDO.setId(1);

        VersionDO mockVersionDO = new VersionDO();
        mockVersionDO.setId(1);

        when(templateDao.findTemplateById(templateDto.getId())).thenReturn(templateDO);
        when(versionDao.queryCountByTemplateAndVersion(templateDO.getId(), templateDto.getCurrentVersion())).thenReturn(0);
        when(versionDao.save(any(VersionDO.class))).thenReturn(mockVersionDO);
        when(templateDao.updateTemplate(anyInt(), anyInt())).thenReturn(1);

        boolean response = versionService.upload(templateDto, file);

        assertTrue(response);
    }

    @Test
    void testGetVersion_Success() {
        int versionId = 1;
        VersionDO versionDO = new VersionDO();
        versionDO.setId(versionId);

        when(versionDao.findById(versionId)).thenReturn(Optional.of(versionDO));

        VersionDO result = versionService.getVersion(versionId);

        assertNotNull(result);
        assertEquals(versionId, result.getId());
        verify(versionDao).findById(versionId);
    }

    @Test
    void testGetVersion_NotFound() {
        int versionId = 1;

        when(versionDao.findById(versionId)).thenReturn(Optional.empty());

        VersionDO result = versionService.getVersion(versionId);

        assertNull(result);
        verify(versionDao).findById(versionId);
    }

    @Test
    void testGetLatestVersion() {
        int templateId = 1;
        VersionDO versionDO = new VersionDO();
        versionDO.setId(1);

        when(versionDao.queryLatestByTemplate(templateId)).thenReturn(versionDO);

        VersionDO result = versionService.getLatestVersion(templateId);

        assertNotNull(result);
        assertEquals(1, result.getId());
        verify(versionDao).queryLatestByTemplate(templateId);
    }
}