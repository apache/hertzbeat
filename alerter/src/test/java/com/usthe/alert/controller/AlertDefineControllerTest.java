package com.usthe.alert.controller;

import com.usthe.alert.service.impl.AlertDefineServiceImpl;
import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
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

import java.util.Collections;
import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link AlertDefineController}
 *
 * @author ceilzcx
 */
@ExtendWith(MockitoExtension.class)
class AlertDefineControllerTest {

    private MockMvc mockMvc;

    private AlertDefine alertDefine;

    private List<AlertDefineMonitorBind> alertDefineMonitorBinds;

    @Mock
    private AlertDefineServiceImpl alertDefineService;

    @InjectMocks
    private AlertDefineController alertDefineController;

    @BeforeEach
    void setUp() {
        // standaloneSetup: 独立安装, 不集成web环境测试
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertDefineController).build();

        this.alertDefine = AlertDefine.builder()
                .id(1L)
                .app("app")
                .metric("test")
                .field("test")
                .preset(false)
                .expr("1 > 0")
                .priority((byte) 1)
                .times(1)
                .template("template")
                .creator("tom")
                .modifier("tom")
                .build();

        this.alertDefineMonitorBinds = Collections.singletonList(
                AlertDefineMonitorBind.builder()
                        .id(1L)
                        .alertDefineId(this.alertDefine.getId())
                        .monitorId(1L)
                        .monitor(
                                Monitor.builder()
                                        .id(1L)
                                        .app("app")
                                        .host("localhost")
                                        .name("monitor")
                                        .build()
                        )
                        .build()
        );
    }

    @Test
    void addNewAlertDefine() throws Exception {
        // 模拟客户端往服务端发送请求
        mockMvc.perform(MockMvcRequestBuilders.post("/api/alert/define")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(this.alertDefine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void modifyAlertDefine() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.put("/api/alert/define")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(this.alertDefine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getAlertDefine() throws Exception {
        // 模拟getAlertDefine返回数据
        Mockito.when(alertDefineService.getAlertDefine(this.alertDefine.getId()))
                .thenReturn(this.alertDefine);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alert/define/" + this.alertDefine.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.id").value(alertDefine.getId()))
                .andExpect(jsonPath("$.data.app").value(alertDefine.getApp()))
                .andExpect(jsonPath("$.data.metric").value(alertDefine.getMetric()))
                .andExpect(jsonPath("$.data.field").value(alertDefine.getField()))
                .andExpect(jsonPath("$.data.expr").value(alertDefine.getExpr()))
                .andExpect(jsonPath("$.data.template").value(alertDefine.getTemplate()))
                .andExpect(jsonPath("$.data.gmtCreate").value(alertDefine.getGmtCreate()))
                .andExpect(jsonPath("$.data.gmtUpdate").value(alertDefine.getGmtUpdate()))
                .andReturn();
    }

    @Test
    void deleteAlertDefine() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.delete("/api/alert/define/" + this.alertDefine.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(this.alertDefine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void applyAlertDefineMonitorsBind() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/alert/define/" + this.alertDefine.getId() + "/monitors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(GsonUtil.toJson(this.alertDefineMonitorBinds)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getAlertDefineMonitorsBind() throws Exception {
        Mockito.when(alertDefineService.getBindAlertDefineMonitors(this.alertDefine.getId()))
                .thenReturn(this.alertDefineMonitorBinds);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alert/define/" + this.alertDefine.getId() + "/monitors")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data[0].id").value(alertDefineMonitorBinds.get(0).getId()))
                .andExpect(jsonPath("$.data[0].monitor.id").value(alertDefineMonitorBinds.get(0).getMonitor().getId()))
                .andReturn();
    }
}