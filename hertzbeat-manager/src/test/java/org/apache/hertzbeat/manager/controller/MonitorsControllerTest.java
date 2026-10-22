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

package org.apache.hertzbeat.manager.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.springframework.data.domain.PageImpl;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.data.web.config.SpringDataJackson3Configuration;
import org.springframework.data.web.config.SpringDataWebSettings;
import tools.jackson.databind.json.JsonMapper;

/**
 * Test case for {@link MonitorsController}
 */
@ExtendWith(MockitoExtension.class)
class MonitorsControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MonitorServiceImpl monitorService;

    @InjectMocks
    private MonitorsController monitorsController;

    @BeforeEach
    void setUp() {
        JacksonJsonHttpMessageConverter messageConverter = new JacksonJsonHttpMessageConverter(
                JsonMapper.builder()
                        .addModule(new SpringDataJackson3Configuration.PageModule(
                                new SpringDataWebSettings(EnableSpringDataWebSupport.PageSerializationMode.DIRECT)))
                        .build());
        this.mockMvc = MockMvcBuilders.standaloneSetup(monitorsController)
                .setMessageConverters(messageConverter)
                .build();
    }

    @Test
    void getMonitors() throws Exception {
        Monitor monitor = Monitor.builder().id(6565463543L).name("website-prod").app("website").build();
        when(monitorService.getMonitors(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
                Mockito.any(), Mockito.anyInt(), Mockito.anyInt(), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of(monitor)));

        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/monitors?app={app}&ids={ids}&host={host}&id={id}",
                        "website",
                        6565463543L,
                        "127.0.0.1",
                        "id"
                ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content[0].name").value("website-prod"))
                .andReturn();
    }

    @Test
    void getAppMonitors() throws Exception {
        when(monitorService.getAppMonitors("linux"))
                .thenReturn(List.of(Monitor.builder().id(1L).name("linux-prod").app("linux").build()));
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/{app}", "linux"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data[0].name").value("linux-prod"))
                .andReturn();
    }

    @Test
    void deleteMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void cancelManageMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void enableManageMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @ParameterizedTest
    @ValueSource(strings = {"JSON", "EXCEL", "YAML"})
    void adminCanExportBothEndpoints(String type) throws Exception {
        SubjectSum subject = Mockito.mock(SubjectSum.class);
        when(subject.hasRole("admin")).thenReturn(true);
        try (var context = Mockito.mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/export")
                            .param("ids", "1,2").param("type", type))
                    .andExpect(status().isOk());
            mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/export/all").param("type", type))
                    .andExpect(status().isOk());
            Mockito.verify(monitorService).export(Mockito.eq(List.of(1L, 2L)), Mockito.eq(type), Mockito.any());
            Mockito.verify(monitorService).exportAll(Mockito.eq(type), Mockito.any());
        }
    }

    // No security filter is installed in this standalone setup: the controller
    // must still deny export when an old external resource rule permits the route.
    @ParameterizedTest
    @CsvSource({"user,JSON", "user,EXCEL", "user,YAML", "guest,JSON", "guest,EXCEL", "guest,YAML"})
    void nonAdminCannotExportEvenWithoutRouteAuthorization(String role, String type) throws Exception {
        SubjectSum subject = Mockito.mock(SubjectSum.class, role);
        when(subject.hasRole("admin")).thenReturn(false);
        try (var context = Mockito.mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            assertExportDenied(type, 403);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"JSON", "EXCEL", "YAML"})
    void unauthenticatedCannotExport(String type) throws Exception {
        try (var context = Mockito.mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(null);
            assertExportDenied(type, 401);
        }
    }

    private void assertExportDenied(String type, int statusCode) throws Exception {
        for (String path : List.of("/api/monitors/export", "/api/monitors/export/all")) {
            mockMvc.perform(MockMvcRequestBuilders.get(path).param("ids", "1,2").param("type", type))
                    .andExpect(status().is(statusCode))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                            .header().doesNotExist("Content-Disposition"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(""));
        }
        Mockito.verifyNoInteractions(monitorService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"json", "xlsx", "xls", "yaml", "yml"})
    void adminCanImport(String extension) throws Exception {
        SubjectSum subject = Mockito.mock(SubjectSum.class);
        when(subject.hasRole("admin")).thenReturn(true);
        MockMultipartFile file = importFile(extension);
        try (var context = Mockito.mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            mockMvc.perform(MockMvcRequestBuilders.multipart("/api/monitors/import").file(file))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.msg").value("Import success"));
            Mockito.verify(monitorService).importConfig(file);
        }
    }

    // The filter is deliberately absent: old external rules cannot bypass the controller.
    @ParameterizedTest
    @CsvSource({"user,json", "user,xlsx", "user,xls", "user,yaml", "user,yml",
            "guest,json", "guest,xlsx", "guest,xls", "guest,yaml", "guest,yml"})
    void nonAdminCannotImportEvenWithoutRouteAuthorization(String role, String extension) throws Exception {
        SubjectSum subject = Mockito.mock(SubjectSum.class, role);
        when(subject.hasRole("admin")).thenReturn(false);
        try (var context = Mockito.mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            assertImportDenied(extension, 403);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"json", "xlsx", "xls", "yaml", "yml"})
    void unauthenticatedCannotImport(String extension) throws Exception {
        try (var context = Mockito.mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(null);
            assertImportDenied(extension, 401);
        }
    }

    private void assertImportDenied(String extension, int statusCode) throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/monitors/import").file(importFile(extension)))
                .andExpect(status().is(statusCode));
        Mockito.verifyNoInteractions(monitorService);
    }

    private MockMultipartFile importFile(String extension) {
        return new MockMultipartFile("file", "synthetic." + extension,
                MediaType.APPLICATION_OCTET_STREAM_VALUE, new byte[0]);
    }
}
