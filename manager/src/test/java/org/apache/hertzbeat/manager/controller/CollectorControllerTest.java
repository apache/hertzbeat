package org.apache.hertzbeat.manager.controller;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.impl.CollectorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link CollectorController}
 */
@ExtendWith(MockitoExtension.class)
@Slf4j
public class CollectorControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private CollectorController collectorController;

    @Mock
    private CollectorServiceImpl collectorService;

    @Mock
    private ManageServer manageServer;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(collectorController).build();
    }

    @Test
    public void getCollectors() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/collector?name={name}&pageIndex={pageIndex}&pageSize={pageSize}",
                        "tom", 0, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void onlineCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/online")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void offlineCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/offline")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


    @Test
    public void deleteCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.delete(
                                "/api/collector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void generateCollectorDeployInfo() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.post(
                        "/api/collector/generate/{collector}",
                        "demo-collector"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


}
