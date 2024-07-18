package org.apache.hertzbeat.manager.dao;

import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link CollectorDao}
 */
@Transactional
public class CollectorDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private CollectorDao collectorDao;


    @BeforeEach
    void setUp() {
        Collector creator = Collector.builder()
                .id(1L)
                .name("test")
                .mode("public")
                .status((byte) 1)
                .ip("192.34.5.43")
                .creator("tom")
                .build();
        creator = collectorDao.save(creator);
        assertNotNull(creator);
    }

    @AfterEach
    public void deleteAll() {
        collectorDao.deleteAll();
    }

    @Test
    public void deleteCollectorByName() {
        collectorDao.deleteCollectorByName("test");
    }

    @Test
    public void findCollectorByName() {
        assertTrue(collectorDao.findCollectorByName("test").isPresent());
    }


}
