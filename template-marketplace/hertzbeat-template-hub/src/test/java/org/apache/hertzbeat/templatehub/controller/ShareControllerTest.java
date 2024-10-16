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

package org.apache.hertzbeat.templatehub.controller;

import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.apache.hertzbeat.templatehub.util.Base62Util;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test case for {@link ShareController}
 */
@ExtendWith(MockitoExtension.class)
class ShareControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TemplateService templateService;

    @Mock
    private VersionService versionService;

    @InjectMocks
    private ShareController shareController;

    private final String serverAddress = "localhost";
    private final String serverPort = "8080";
    private final String contextPath = "/api";

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        this.mockMvc = MockMvcBuilders.standaloneSetup(shareController).build();

        ReflectionTestUtils.setField(shareController, "serverAddress", serverAddress);
        ReflectionTestUtils.setField(shareController, "serverPort", serverPort);
        ReflectionTestUtils.setField(shareController, "contextPath", contextPath);
    }

    @Test
    public void testGetShareURL_ValidVersion() throws Exception {
        int versionId = 1;

        Version mockVersion = new Version();
        mockVersion.setId(versionId);
        mockVersion.setVersion("v1.0.0");
        mockVersion.setTemplate(1);

        String expectedUrl = "http://" + serverAddress + ":" + serverPort + contextPath + "/share/share/" + Base62Util.idToShortKey(versionId + 100000000);

        when(versionService.getVersion(versionId)).thenReturn(mockVersion);

        this.mockMvc.perform(get("/share/getShareURL/{versionId}",versionId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.msg").value(expectedUrl));
    }

    @Test
    public void testDownloadShare_ValidKey() throws Exception {
        String key = Base62Util.idToShortKey(100000001);
        int versionId = 1;
        Version mockVersion = new Version();
        mockVersion.setId(versionId);
        mockVersion.setVersion("v1.0.0");
        mockVersion.setTemplate(1);

        Template mockTemplate = new Template();
        mockTemplate.setId(1);
        mockTemplate.setUser(1);

        Resource mockResource = mock(Resource.class);

        when(versionService.getVersion(versionId)).thenReturn(mockVersion);
        when(templateService.getTemplate(1)).thenReturn(mockTemplate);
        when(templateService.downloadTemplate(mockVersion.getId(), mockTemplate.getId(), mockVersion.getVersion(), mockVersion.getId())).thenReturn(mockResource);

        mockMvc.perform(get("/share/share/{key}", key)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + mockVersion.getVersion() + ".yml\""))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    public void testDownloadShare_InvalidKey() throws Exception {
        String invalidKey = "invalidKey";

        this.mockMvc.perform(get("/api/share/share/{key}", invalidKey)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}