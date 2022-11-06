package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Monitor;
import com.usthe.manager.AbstractSpringIntegrationTest;
import com.usthe.manager.pojo.dto.AppCount;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test case for {@link MonitorDao}
 */
@Transactional
class MonitorDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private MonitorDao monitorDao;

    @BeforeEach
    void setUp() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitor = monitorDao.saveAndFlush(monitor);
        assertNotNull(monitor);
    }

    @AfterEach
    void tearDown() {
        monitorDao.deleteAll();
    }

    @Test
    void deleteAllByIdIn() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        assertDoesNotThrow(() -> monitorDao.deleteAllByIdIn(ids));
    }

    @Test
    void findMonitorsByIdIn() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(ids);
        assertNotNull(monitors);
        assertEquals(1, monitors.size());
    }

    @Test
    void findMonitorsByAppEquals() {
        List<Monitor> monitors = monitorDao.findMonitorsByAppEquals("jvm");
        assertNotNull(monitors);
        assertEquals(1, monitors.size());
        monitors = monitorDao.findMonitorsByAppEquals("mysql");
        assertTrue(monitors.isEmpty());
    }

    @Test
    void findMonitorsByStatusNotInAndAndJobIdNotNull() {
        List<Byte> bytes = Arrays.asList((byte) 2, (byte) 3);
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndAndJobIdNotNull(bytes);
        assertNotNull(monitors);
        assertEquals(1, monitors.size());
    }

    @Test
    void findMonitorByNameEquals() {
        Optional<Monitor> monitorOptional = monitorDao.findMonitorByNameEquals("jvm_test");
        assertTrue(monitorOptional.isPresent());
    }

    @Test
    void findAppsStatusCount() {
        List<AppCount> appCounts = monitorDao.findAppsStatusCount();
        assertNotNull(appCounts);
        assertFalse(appCounts.isEmpty());
    }

    @Test
    void updateMonitorStatus() {
        Optional<Monitor> monitorOptional = monitorDao.findById(1L);
        assertTrue(monitorOptional.isPresent());
        assertEquals((byte) 1, monitorOptional.get().getStatus());
        monitorDao.updateMonitorStatus(1L, (byte) 0);
        monitorOptional = monitorDao.findById(1L);
        assertTrue(monitorOptional.isPresent());
        assertEquals((byte) 0, monitorOptional.get().getStatus());
    }
}