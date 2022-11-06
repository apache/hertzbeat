package com.usthe.manager.support;

import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.controller.MonitorController;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.support.exception.AlertNoticeException;
import com.usthe.manager.support.exception.MonitorDatabaseException;
import com.usthe.manager.support.exception.MonitorDetectException;
import com.usthe.manager.support.exception.MonitorMetricsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static com.usthe.common.util.CommonConstants.DETECT_FAILED_CODE;
import static com.usthe.common.util.CommonConstants.FAIL_CODE;
import static com.usthe.common.util.CommonConstants.MONITOR_CONFLICT_CODE;
import static com.usthe.common.util.CommonConstants.PARAM_INVALID_CODE;
import static com.usthe.common.util.CommonConstants.SUCCESS_CODE;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link GlobalExceptionHandler}
 */
@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @Mock
    private MonitorController monitorController;

    @BeforeEach
    void setUp() {
        // do nothing
    }

    @Test
    void handleMonitorDetectException() throws Exception {
        doThrow(new MonitorDetectException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) DETECT_FAILED_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleMonitorDatabaseException() throws Exception {
        doThrow(new MonitorDatabaseException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(false);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) MONITOR_CONFLICT_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleIllegalArgumentException() throws Exception {
        doThrow(new IllegalArgumentException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) PARAM_INVALID_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleAlertNoticeException() throws Exception {
        doThrow(new AlertNoticeException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleHttpMessageNotReadableException() throws Exception {
        doThrow(new HttpMessageNotReadableException("HttpMessageNotReadableException", new RuntimeException("mock exception")))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) PARAM_INVALID_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleInputValidException() throws Exception {
        // MethodArgumentNotValidException
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .intervals(1) // throw MethodArgumentNotValidException
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) PARAM_INVALID_CODE))
                .andExpect(jsonPath("$.msg").value("Min.monitorDto.monitor.intervals:must be greater than or equal to 10"));
    }

    @Test
    void handleDataAccessException() throws Exception {
        doThrow(new MockDataAccessException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value((int) MONITOR_CONFLICT_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleMethodNotSupportException() throws Exception {
        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.get("/api/monitor"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Request method 'GET' not supported"));
    }

    @Test
    void handleUnknownException() throws Exception {
        doThrow(new UnknownException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value((int) MONITOR_CONFLICT_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    @Test
    void handleMonitorMetricsException() throws Exception {
        doThrow(new MonitorMetricsException("mock exception"))
                .when(monitorController)
                .addNewMonitor(isA(MonitorDto.class));
        MonitorDto monitorDto = new MonitorDto();
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(Collections.emptyList());
        monitorDto.setDetected(true);

        MockMvcBuilders.standaloneSetup(monitorController)
                .setControllerAdvice(GlobalExceptionHandler.class)
                .build()
                .perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) PARAM_INVALID_CODE))
                .andExpect(jsonPath("$.msg").value("mock exception"));
    }

    private static class MockDataAccessException extends DataAccessException {

        public MockDataAccessException(String msg) {
            super(msg);
        }
    }

    private static class UnknownException extends RuntimeException {
        public UnknownException(String msg) {
            super(msg);
        }
    }

}