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

import org.apache.hertzbeat.templatehub.model.dao.StarDao;
import org.apache.hertzbeat.templatehub.model.dao.VersionDao;
import org.apache.hertzbeat.templatehub.model.entity.Star;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.impl.StarServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test case for {@link StarService}
 */
@ExtendWith(MockitoExtension.class)
class StarServiceTest {

    @InjectMocks
    private StarServiceImpl starService;

    @Mock
    private StarDao starDao;

    @Mock
    private VersionDao versionDao;

    private final int userId = 1;
    private final int templateId = 1;
    private final int versionId = 1;
    private final String nowTime = "2024-09-28T12:00:00Z";

    @Test
    void testStarVersion() {
        Star starToSave = new Star();
        starToSave.setId(0);
        starToSave.setUserId(userId);
        starToSave.setTemplateId(templateId);
        starToSave.setVersionId(versionId);
        starToSave.setCreateTime(nowTime);
        int isDel = 0;
        starToSave.setIsDel(isDel);

        when(starDao.save(any(Star.class))).thenReturn(new Star() {{
            setId(1);
        }});

        int result = starService.starVersion(userId, templateId, versionId, nowTime);
        assertEquals(1, result);
        verify(starDao, times(1)).save(any(Star.class));
    }

    @Test
    public void testStarVersion_Failure() {
        when(starDao.save(any(Star.class))).thenReturn(new Star() {{
            setId(0); // Simulate a failure save with ID 0
        }});

        int result = starService.starVersion(userId, templateId, versionId, nowTime);
        assertEquals(0, result);
        verify(starDao, times(1)).save(any(Star.class));
    }

    @Test
    public void testGetPageByUserStar() {
        Version version = new Version();
        version.setId(versionId);
        version.setTemplate(templateId);

        Page<Version> mockPage = new PageImpl<>(Collections.singletonList(version));
        when(versionDao.queryPageByUserStar(userId, 0, 0, 0, PageRequest.of(0, 10)))
                .thenReturn(mockPage);

        Page<Version> result = starService.getPageByUserStar(userId, 0, 0, 0, 0, 10);
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(versionDao, times(1)).queryPageByUserStar(userId, 0, 0, 0, PageRequest.of(0, 10));
    }

    @Test
    public void testCancelStarByUser_Success() {
        when(starDao.cancelByUser(1, userId, versionId, 0)).thenReturn(1); // Simulate successful cancellation

        Boolean result = starService.cancelStarByUser(userId, versionId);
        assertTrue(result);
        verify(starDao, times(1)).cancelByUser(1, userId, versionId, 0);
    }

    @Test
    public void testCancelStarByUser_Failure() {
        when(starDao.cancelByUser(1, userId, versionId, 0)).thenReturn(0); // Simulate failure

        Boolean result = starService.cancelStarByUser(userId, versionId);
        assertFalse(result);
        verify(starDao, times(1)).cancelByUser(1, userId, versionId, 0);
    }
}