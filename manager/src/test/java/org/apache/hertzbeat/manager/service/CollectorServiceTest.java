package org.apache.hertzbeat.manager.service;


import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.scheduler.ConsistentHash;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.impl.CollectorServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;


/**
 * Test case for {@link CollectorService}
 */
@ExtendWith(MockitoExtension.class)
public class CollectorServiceTest {

    @Spy
    @InjectMocks
    private CollectorServiceImpl collectorService;

    @Mock
    private CollectorDao collectorDao;

    @Mock
    private ConsistentHash consistentHash;

    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Mock
    private ManageServer manageServer;


    @Test
    public void getCollectors() {
        Specification<Collector> specification = mock(Specification.class);
        when(collectorDao.findAll(specification, PageRequest.of(1, 1))).thenReturn(Page.empty());
        assertDoesNotThrow(() -> collectorService.getCollectors(specification, PageRequest.of(1, 1)));
    }

    @Test
    public void deleteRegisteredCollector() {
        List<String> collectors = new ArrayList<>();
        collectors.add("test");
        collectorService.deleteRegisteredCollector(collectors);
    }

    @Test
    public void hasCollector() {
        collectorService.hasCollector("test");
    }
}
