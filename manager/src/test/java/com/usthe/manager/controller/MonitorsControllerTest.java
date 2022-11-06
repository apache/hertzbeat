package com.usthe.manager.controller;

import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.service.TagService;
import com.usthe.manager.service.impl.MonitorServiceImpl;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
        this.mockMvc = MockMvcBuilders.standaloneSetup(monitorsController).build();
    }

    @Test
    void getMonitors() throws Exception {

        this.mockMvc.perform(MockMvcRequestBuilders.get(
                "/api/monitors?app={app}&ids={ids}&host={host}&id={id}",
                        "website",
                                    6565463543L,
                                    "127.0.0.1",
                                    "id"
                        ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getAppMonitors() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/{app}", "linux"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void deleteMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(ids)))
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
                .content(GsonUtil.toJson(ids)))
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
                        .content(GsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}