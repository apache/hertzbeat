package org.dromara.hertzbeat.alert.service;

import org.dromara.hertzbeat.alert.dao.AlertDefineBindDao;
import org.dromara.hertzbeat.alert.dao.AlertDefineDao;
import org.dromara.hertzbeat.alert.service.impl.AlertDefineServiceImpl;
import org.dromara.hertzbeat.common.entity.alerter.AlertDefine;
import org.dromara.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Test case for {@link AlertDefineService}
 */
@ExtendWith(MockitoExtension.class)
class AlertDefineServiceTest {

    private AlertDefine alertDefine;

    private List<AlertDefineMonitorBind> alertDefineMonitorBinds;

    @Mock
    private AlertDefineDao alertDefineDao;

    @Mock
    private AlertDefineBindDao alertDefineBindDao;

    @InjectMocks
    private AlertDefineServiceImpl alertDefineService;

    @BeforeEach
    void setUp() {
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
    void validate() {
        assertDoesNotThrow(() -> alertDefineService.validate(alertDefine, true));
        assertDoesNotThrow(() -> alertDefineService.validate(alertDefine, false));

    }

    @Test
    void addAlertDefine() {
        assertDoesNotThrow(() -> alertDefineService.addAlertDefine(alertDefine));
        when(alertDefineDao.save(alertDefine)).thenThrow(new RuntimeException());
        assertThrows(RuntimeException.class, () -> alertDefineService.addAlertDefine(alertDefine));

    }

    @Test
    void modifyAlertDefine() {
        AlertDefine alertDefine = AlertDefine.builder().id(1L).build();
        when(alertDefineDao.save(alertDefine)).thenReturn(alertDefine);
        assertDoesNotThrow(() -> alertDefineService.modifyAlertDefine(alertDefine));
        reset();
        when(alertDefineDao.save(alertDefine)).thenThrow(new RuntimeException());
        assertThrows(RuntimeException.class, () -> alertDefineService.modifyAlertDefine(alertDefine));
    }

    @Test
    void deleteAlertDefine() {
        long id = 1L;
        doNothing().doThrow(new RuntimeException()).when(alertDefineDao).deleteById(id);
        assertDoesNotThrow(() -> alertDefineService.deleteAlertDefine(id));
        assertThrows(RuntimeException.class, () -> alertDefineService.deleteAlertDefine(id));

    }

    @Test
    void getAlertDefine() {
        long id = 1L;
        AlertDefine alertDefine = AlertDefine.builder().id(id).build();
        when(alertDefineDao.findById(id)).thenReturn(Optional.of(alertDefine));
        assertDoesNotThrow(() -> alertDefineService.getAlertDefine(id));
    }

    @Test
    void deleteAlertDefines() {
        doNothing().when(alertDefineDao).deleteAlertDefinesByIdIn(anySet());
        assertDoesNotThrow(() -> alertDefineService.deleteAlertDefines(new HashSet<>(1)));
    }

    @Test
    void getMonitorBindAlertDefines() {
        Specification<AlertDefine> specification = mock(Specification.class);
        when(alertDefineDao.findAll(specification, PageRequest.of(1, 1))).thenReturn(Page.empty());
        assertNotNull(alertDefineService.getMonitorBindAlertDefines(specification, PageRequest.of(1, 1)));


    }

    @Test
    void applyBindAlertDefineMonitors() {
        long id = 1L;
        doNothing().when(alertDefineBindDao).deleteAlertDefineBindsByAlertDefineIdEquals(id);
        when(alertDefineBindDao.saveAll(alertDefineMonitorBinds)).thenReturn(alertDefineMonitorBinds);
        assertDoesNotThrow(() -> alertDefineService.applyBindAlertDefineMonitors(id, alertDefineMonitorBinds));
    }

    @Test
    void testGetMonitorBindAlertDefines() {
        List<AlertDefine> alertDefineList = new ArrayList<>();
        alertDefineList.add(this.alertDefine);
        when(alertDefineDao.queryAlertDefinesByMonitor(1L, "app", "test")).thenReturn(alertDefineList);
        when(alertDefineDao.queryAlertDefinesByAppAndMetricAndPresetTrueAndEnableTrue("app", "test")).thenReturn(alertDefineList);
        assertNotNull(alertDefineService.getMonitorBindAlertDefines(1L, "app", "test"));

    }

    @Test
    void getAlertDefines() {
        Specification<AlertDefine> specification = mock(Specification.class);
        when(alertDefineDao.findAll(specification, PageRequest.of(1, 1))).thenReturn(Page.empty());
        assertNotNull(alertDefineService.getAlertDefines(specification, PageRequest.of(1, 1)));
    }

    @Test
    void getBindAlertDefineMonitors() {
        Long id = 1L;
        when(alertDefineBindDao.getAlertDefineBindsByAlertDefineIdEquals(id)).thenReturn(alertDefineMonitorBinds);
        assertDoesNotThrow(() -> alertDefineService.getBindAlertDefineMonitors(id));
    }
}