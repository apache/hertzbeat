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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.springframework.data.domain.PageImpl;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;
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
    void getMonitorsKeepsLegacyHostQueryAsSearchAlias() throws Exception {
        Monitor monitor = Monitor.builder().id(6565463544L).name("host-prod").app("website").build();
        when(monitorService.getMonitors(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
                Mockito.any(), Mockito.anyInt(), Mockito.anyInt(), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of(monitor)));

        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/monitors?app={app}&host={host}",
                        "website",
                        "127.0.0.1"
                ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content[0].name").value("host-prod"))
                .andReturn();

        verify(monitorService).getMonitors(
                isNull(), eq("website"), eq("127.0.0.1"), isNull(),
                eq("gmtCreate"), eq("desc"), eq(0), eq(8), isNull());
    }

    @Test
    void getMonitorsKeepsLegacyIdQueryAsIdsAlias() throws Exception {
        Monitor monitor = Monitor.builder().id(6565463543L).name("id-prod").app("website").build();
        when(monitorService.getMonitors(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
                Mockito.any(), Mockito.anyInt(), Mockito.anyInt(), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of(monitor)));

        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/monitors?app={app}&id={id}",
                        "website",
                        6565463543L
                ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content[0].name").value("id-prod"))
                .andReturn();

        verify(monitorService).getMonitors(
                eq(List.of(6565463543L)), eq("website"), isNull(), isNull(),
                eq("gmtCreate"), eq("desc"), eq(0), eq(8), isNull());
    }

    @Test
    void getMonitorsKeepsLegacyCommaSeparatedIdQueryAsIdsAlias() throws Exception {
        Monitor monitor = Monitor.builder().id(6565463543L).name("id-prod").app("website").build();
        when(monitorService.getMonitors(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
                Mockito.any(), Mockito.anyInt(), Mockito.anyInt(), Mockito.any()))
                .thenReturn(new PageImpl<>(List.of(monitor)));

        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/monitors?app={app}&id={id}",
                        "website",
                        "6565463543,6565463544"
                ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content[0].name").value("id-prod"))
                .andReturn();

        verify(monitorService).getMonitors(
                eq(List.of(6565463543L, 6565463544L)), eq("website"), isNull(), isNull(),
                eq("gmtCreate"), eq("desc"), eq(0), eq(8), isNull());
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

        verify(monitorService).deleteMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void deleteMonitorsKeepsLegacyIdQueryAsIdsAlias() throws Exception {
        List<Long> ids = List.of(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors")
                        .param("id", String.valueOf(ids.get(0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        verify(monitorService).deleteMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void deleteMonitorsKeepsLegacyCommaSeparatedIdQueryAsIdsAlias() throws Exception {
        List<Long> ids = List.of(6565463543L, 6565463544L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors")
                        .param("id", ids.stream().map(String::valueOf).collect(Collectors.joining(","))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        verify(monitorService).deleteMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void deleteMonitorsPreservesSubmittedIdOrderAsRequestEvidence() throws Exception {
        List<Long> ids = List.of(6565463544L, 6565463543L, 6565463545L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors")
                        .param("id", ids.stream().map(String::valueOf).collect(Collectors.joining(","))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        @SuppressWarnings({"unchecked", "rawtypes"})
        ArgumentCaptor<Set<Long>> idsCaptor = ArgumentCaptor.forClass((Class) Set.class);
        verify(monitorService).deleteMonitors(idsCaptor.capture());
        assertTrue(idsCaptor.getValue() instanceof java.util.LinkedHashSet,
                "bulk monitor routes should keep a deterministic submitted-id set for request evidence");
        assertEquals(ids, new ArrayList<>(idsCaptor.getValue()));
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

        verify(monitorService).cancelManageMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void cancelManageMonitorsKeepsLegacyIdQueryAsIdsAlias() throws Exception {
        List<Long> ids = List.of(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors/manage")
                        .param("id", String.valueOf(ids.get(0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        verify(monitorService).cancelManageMonitors(eq(new HashSet<>(ids)));
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

        verify(monitorService).enableManageMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void enableManageMonitorsKeepsLegacyIdQueryAsIdsAlias() throws Exception {
        List<Long> ids = List.of(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/manage")
                        .param("id", String.valueOf(ids.get(0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        verify(monitorService).enableManageMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void enableManageMonitorsKeepsPostMutationAlias() throws Exception {
        List<Long> ids = List.of(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitors/manage")
                        .param("ids", String.valueOf(ids.get(0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        verify(monitorService).enableManageMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void enableManageMonitorsKeepsPutMutationAliasWithBodyIds() throws Exception {
        List<Long> ids = List.of(6565463543L, 6565463544L);

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/monitors/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        verify(monitorService).enableManageMonitors(eq(new HashSet<>(ids)));
    }

    @Test
    void export() throws Exception {
        List<Long> ids = Arrays.asList(6565463543L, 6565463544L);
        String type = "JSON";

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/export")
                        .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                        .param("type", type))
                .andExpect(status().isOk())
                .andReturn();
    }

    @Test
    void exportKeepsLegacyIdQueryAsIdsAlias() throws Exception {
        List<Long> ids = List.of(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/export")
                        .param("id", String.valueOf(ids.get(0)))
                        .param("type", "JSON"))
                .andExpect(status().isOk())
                .andReturn();

        verify(monitorService).export(eq(ids), eq("JSON"), Mockito.any());
    }

    @Test
    void export2() throws Exception {
        byte[] monitorConfig = "[{\"name\":\"website-prod\"}]".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "file", "monitors.json", MediaType.APPLICATION_JSON_VALUE, monitorConfig);
        doNothing().when(monitorService).importConfig(Mockito.any());

        this.mockMvc.perform(MockMvcRequestBuilders.multipart("/api/monitors/import")
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("0"))
                .andExpect(jsonPath("$.msg").value("Import success"));

        ArgumentCaptor<MultipartFile> importedFileCaptor = ArgumentCaptor.forClass(MultipartFile.class);
        verify(monitorService).importConfig(importedFileCaptor.capture());
        MultipartFile importedFile = importedFileCaptor.getValue();
        assertEquals("file", importedFile.getName());
        assertEquals("monitors.json", importedFile.getOriginalFilename());
        assertEquals("[{\"name\":\"website-prod\"}]",
                new String(importedFile.getBytes(), StandardCharsets.UTF_8));
    }

    @Test
    void importMonitorsDeclaresExplicitFilePartBinding() throws Exception {
        String source = Files.readString(Path.of(
                "src/main/java/org/apache/hertzbeat/manager/controller/MonitorsController.java"));

        assertTrue(source.contains("@RequestParam(\"file\") MultipartFile file"),
                "monitor import must bind the uploaded config through the explicit multipart `file` part");
    }

    @Test
    void exportAll() throws Exception {
        String type = "JSON";

        // Mock the behavior of monitorService.exportAll
        doNothing().when(monitorService).exportAll(Mockito.anyString(), Mockito.any());

        // Perform the request and verify the response
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/export/all")
                        .param("type", type))
                .andExpect(status().isOk())
                .andReturn();
    }
}
