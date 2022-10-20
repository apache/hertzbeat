package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Param;
import com.usthe.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Test case for {@link ParamDao}
 */
@Transactional
class ParamDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private ParamDao paramDao;

    @BeforeEach
    void setUp() {
        Param param = Param.builder()
                .field("mock field")
                .value("mock value")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .monitorId(1L)
                .type((byte) 1)
                .build();

        param = paramDao.saveAndFlush(param);
        assertNotNull(param);
    }

    @AfterEach
    void tearDown() {
        paramDao.deleteAll();
    }

    @Test
    void findParamsByMonitorId() {
        List<Param> paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());
    }

    @Test
    void deleteParamsByMonitorId() {
        // make sure params size is correct
        List<Param> paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is wrong
        paramDao.deleteParamsByMonitorId(2L);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is true
        paramDao.deleteParamsByMonitorId(1L);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(0L, paramList.size());
    }

    @Test
    void deleteParamsByMonitorIdIn() {
        // make sure params size is correct
        List<Param> paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is wrong
        Set<Long> ids = new HashSet<>();
        ids.add(2L);
        paramDao.deleteParamsByMonitorIdIn(ids);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is true
        ids.add(1L);
        paramDao.deleteParamsByMonitorId(1L);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(0L, paramList.size());
    }
}