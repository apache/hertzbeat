package org.apache.hertzbeat.push.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.push.PushMetrics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

public class PushMetricsDaoTest {
    @Mock
    private PushMetricsDao pushMetricsDao;

    @InjectMocks
    private PushMetricsDaoTest pushMetricsDaoTest;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shallFindFirstByMonitorIdOrderByTimeDesc() {

        PushMetrics expectedMetrics = new PushMetrics();
        expectedMetrics.setMonitorId(1L);
        expectedMetrics.setTime(System.currentTimeMillis());

        when(pushMetricsDao.findFirstByMonitorIdOrderByTimeDesc(1L)).thenReturn(expectedMetrics);

        PushMetrics actualMetrics = pushMetricsDao.findFirstByMonitorIdOrderByTimeDesc(1L);

        assertEquals(expectedMetrics, actualMetrics);
        verify(pushMetricsDao, times(1)).findFirstByMonitorIdOrderByTimeDesc(1L);
    }

    @Test
    void shallDeleteAllByTimeBefore() {

        doNothing().when(pushMetricsDao).deleteAllByTimeBefore(anyLong());

        pushMetricsDao.deleteAllByTimeBefore(1000L);

        verify(pushMetricsDao, times(1)).deleteAllByTimeBefore(1000L);
    }
    
}
