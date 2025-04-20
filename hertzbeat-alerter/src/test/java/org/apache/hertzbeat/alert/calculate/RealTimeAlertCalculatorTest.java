package org.apache.hertzbeat.alert.calculate;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;


class RealTimeAlertCalculatorTest {

    private RealTimeAlertCalculator calculator;

    @BeforeEach
    void setUp() {
        AlerterWorkerPool mockPool = Mockito.mock(AlerterWorkerPool.class);
        CommonDataQueue mockQueue = Mockito.mock(CommonDataQueue.class);
        AlertDefineService mockAlertDefineService = Mockito.mock(AlertDefineService.class);
        SingleAlertDao mockDao = Mockito.mock(SingleAlertDao.class);
        AlarmCommonReduce mockReduce = Mockito.mock(AlarmCommonReduce.class);
        AlarmCacheManager alarmCacheManager = Mockito.mock(AlarmCacheManager.class);

        Mockito.when(mockDao.querySingleAlertsByStatus(Mockito.anyString()))
                .thenReturn(Collections.emptyList());

        calculator = new RealTimeAlertCalculator(mockPool, mockQueue, mockAlertDefineService, mockDao, mockReduce, alarmCacheManager, false);
    }

    @Test
    void testFilterThresholdsByAppAndMetrics_withInstanceExpr_HasSpace() {
        String app = "redis";
        String instanceId = "501045327364864";
        int priority = 0;

        AlertDefine matchDefine = new AlertDefine();
        matchDefine.setExpr("equals(__app__,\"redis\") && equals(__instance__, \"501045327364864\")");

        AlertDefine unmatchDefine = new AlertDefine();
        unmatchDefine.setExpr("equals(__app__,\"redis\") && equals(__instance__, \"999999999\")");

        List<AlertDefine> allDefines = Arrays.asList(matchDefine, unmatchDefine);

        List<AlertDefine> filtered = calculator.filterThresholdsByAppAndMetrics(allDefines, app, "", Map.of(), instanceId, priority);

        // It should filter out 999999999.
        assertEquals(1, filtered.size());
        assertEquals("equals(__app__,\"redis\") && equals(__instance__, \"501045327364864\")",
                filtered.get(0).getExpr());
    }

    @Test
    void testFilterThresholdsByAppAndMetrics_withInstanceExpr_NoSpace() {
        String app = "redis";
        String instanceId = "501045327364864";
        int priority = 0;

        AlertDefine matchDefine = new AlertDefine();
        matchDefine.setExpr("equals(__app__,\"redis\") && equals(__instance__,\"501045327364864\")");

        AlertDefine unmatchDefine = new AlertDefine();
        unmatchDefine.setExpr("equals(__app__,\"redis\") && equals(__instance__,\"999999999\")");

        List<AlertDefine> allDefines = Arrays.asList(matchDefine, unmatchDefine);

        List<AlertDefine> filtered = calculator.filterThresholdsByAppAndMetrics(allDefines, app, "", Map.of(), instanceId, priority);

        // It should filter out 999999999.
        assertEquals(1, filtered.size());
        assertEquals("equals(__app__,\"redis\") && equals(__instance__,\"501045327364864\")",
                filtered.get(0).getExpr());
    }
}
