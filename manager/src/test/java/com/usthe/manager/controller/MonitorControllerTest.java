package com.usthe.manager.controller;

import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.service.TagService;
import com.usthe.manager.service.impl.MonitorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link MonitorController}
 */
@ExtendWith(MockitoExtension.class)
class MonitorControllerTest {



    private MockMvc mockMvc;


    @Mock
    private MonitorServiceImpl monitorService;

    @InjectMocks
    private MonitorController monitorController;

    public MonitorDto DataTest(){
        Monitor monitor = new Monitor();
        monitor.setApp("website");
        monitor.setId(87584674384L);
        monitor.setJobId(43243543543L);
        monitor.setName("Api-TanCloud.cn");
        monitor.setName("TanCloud");
        monitor.setHost("192.167.25.11");
        monitor.setIntervals(600);
        monitor.setDescription("对SAAS网站TanCloud的可用性监控");
        monitor.setCreator("tom");
        monitor.setModifier("tom");

        List<Param> params = new ArrayList<>();
        Param param = new Param();
        param.setField("host");
        param.setValue("124.222.98.77");
        params.add(param);

        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);
        monitorDto.setDetected(true);
        monitorDto.setParams(params);
        return monitorDto;
    }

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(monitorController).build();
    }

    @Test
    void addNewMonitor() throws Exception {

        MonitorDto monitorDto = DataTest();
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

    }

    @Test
    void modifyMonitor() throws Exception {
        MonitorDto monitorDto = DataTest();

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/monitor")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getMonitor() throws Exception {
        Monitor monitor = new Monitor();
        monitor.setId(87584674384L);
        monitor.setJobId(43243543543L);
        monitor.setName("Api-TanCloud.cn");
        monitor.setName("TanCloud");
        monitor.setHost("192.167.25.11");
        monitor.setIntervals(600);
        monitor.setDescription("对SAAS网站TanCloud的可用性监控");
        monitor.setCreator("tom");
        monitor.setModifier("tom");

        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);


        Mockito.when(monitorService.getMonitorDto(6565463543L))
                .thenReturn(monitorDto);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor/{id}", 6565463543L))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(status().isOk())
                .andReturn();


    }

    @Test
    void deleteMonitor() throws Exception {

        Monitor monitor = new Monitor();
        monitor.setId(87584674384L);
        monitor.setJobId(43243543543L);
        monitor.setName("Api-TanCloud.cn");
        monitor.setName("TanCloud");
        monitor.setHost("192.167.25.11");
        monitor.setIntervals(600);
        monitor.setDescription("对SAAS网站TanCloud的可用性监控");
        monitor.setCreator("tom");
        monitor.setModifier("tom");

        Mockito.when(monitorService.getMonitor(6565463543L))
                .thenReturn(monitor);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitor/{id}", 6565463543L))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andExpect(status().isOk())
                .andReturn();
    }

    @Test
    void detectMonitor() throws Exception {
        MonitorDto monitorDto = DataTest();

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Detect success."))
                .andReturn();

    }

    @Test
    void addNewMonitorOptionalMetrics() throws Exception {
        MonitorDto monitorDto = DataTest();

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor/optional")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();
    }

    @Test
    void getMonitorMetrics() throws Exception {

        List<String> metricNames = new ArrayList<>();

        Mockito.when(monitorService.getMonitorMetrics("app"))
                .thenReturn(metricNames);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor/metric/{app}", "app"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(status().isOk())
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor/metric"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(status().isOk())
                .andReturn();
    }
}