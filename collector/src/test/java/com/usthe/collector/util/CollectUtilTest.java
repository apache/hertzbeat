package com.usthe.collector.util;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Metrics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test case for {@link CollectUtil}
 */
class CollectUtilTest {

    @BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }

    @Test
    void countMatchKeyword() {
        int keyword = CollectUtil.countMatchKeyword("hertzbeat", "e");
        assertEquals(2, keyword);
        int i = CollectUtil.countMatchKeyword("查询id183", "\\d");
        assertEquals(3, i);
        assertEquals(0, CollectUtil.countMatchKeyword(null, null));
    }

    @Test
    void getTimeout() {
        int timeout1 = CollectUtil.getTimeout("4000");
        assertEquals(4000, timeout1);
        int timeout2 = CollectUtil.getTimeout("4000.5");
        assertEquals(4000, timeout2);
        int timeout3 = CollectUtil.getTimeout("a4000.5");
        assertEquals(60000, timeout3);
        int timeout4 = CollectUtil.getTimeout(null);
        assertEquals(60000, timeout4);
    }

    @Test
    void extractDoubleAndUnitFromStr() {
        CollectUtil.DoubleAndUnit res1 = CollectUtil.extractDoubleAndUnitFromStr("20.5%");
        assertEquals(20.5, res1.getValue());
        assertEquals("%", res1.getUnit());

        CollectUtil.DoubleAndUnit res2 = CollectUtil.extractDoubleAndUnitFromStr("");
        assertNull(res2);

        CollectUtil.DoubleAndUnit res3 = CollectUtil.extractDoubleAndUnitFromStr("KB");
        assertEquals(0, res3.getValue());
        assertEquals("KB", res3.getUnit());
    }


    @Test
    void assertPromRequireField() {
        assertEquals(true, CollectUtil.assertPromRequireField("timestamp"));
        assertEquals(true, CollectUtil.assertPromRequireField("value"));
        assertEquals(false, CollectUtil.assertPromRequireField("timestamp_value"));
    }

    @Test
    void containCryPlaceholder() {
        Metrics metrics = Metrics.builder().name("^o^name^o^").build();
        JsonElement jsonElement = new Gson().toJsonTree(metrics);
        assertTrue(CollectUtil.containCryPlaceholder(jsonElement));
    }

    @Test
    void replaceCryPlaceholder() {
        Metrics metrics = Metrics.builder().name("^o^name^o^").build();
        JsonElement jsonElement = new Gson().toJsonTree(metrics);
        Map<String, Configmap> configmap = new HashMap<>();
        Configmap config = Configmap.builder().key("name").value("张三").build();
        configmap.put("name", config);
        JsonElement res1 = CollectUtil.replaceCryPlaceholder(jsonElement, configmap);

        Metrics metricsTarget = Metrics.builder().name("张三").build();
        JsonElement jsonElementTarget = new Gson().toJsonTree(metricsTarget);
        assertEquals(jsonElementTarget.toString(), res1.toString());


        List<Metrics> metricsList = new ArrayList<>();
        metricsList.add(metrics);
        metricsList.add(metrics);
        JsonElement jsonArray = new Gson().toJsonTree(metricsList);
        JsonElement res2 = CollectUtil.replaceCryPlaceholder(jsonArray, configmap);

        List<Metrics> metricsListTarget = new ArrayList<>();
        metricsListTarget.add(metricsTarget);
        metricsListTarget.add(metricsTarget);
        JsonElement jsonArrayTarget = new Gson().toJsonTree(metricsListTarget);
        assertEquals(jsonArrayTarget.toString(), res2.toString());
    }

    @Test
    void replaceSmilingPlaceholder() {
        Metrics metrics = Metrics.builder().name("^_^name^_^").build();
        JsonElement jsonElement = new Gson().toJsonTree(metrics);
        HashMap<String, Configmap> configmap = new HashMap<>();
        Configmap config = Configmap.builder().key("name").value("张三").build();
        configmap.put("name", config);
        JsonElement res = CollectUtil.replaceSmilingPlaceholder(jsonElement, configmap);
        Metrics metricsTarget = Metrics.builder().name("张三").build();
        JsonElement jsonElement2 = new Gson().toJsonTree(metricsTarget);
        assertEquals(jsonElement2.toString(), res.toString());


        List<Metrics> metricsList = new ArrayList<>();
        metricsList.add(metrics);
        metricsList.add(metrics);
        JsonElement jsonArray = new Gson().toJsonTree(metricsList);
        JsonElement res2 = CollectUtil.replaceSmilingPlaceholder(jsonArray, configmap);

        List<Metrics> metricsListTarget = new ArrayList<>();
        metricsListTarget.add(metricsTarget);
        metricsListTarget.add(metricsTarget);
        JsonElement jsonArrayTarget = new Gson().toJsonTree(metricsListTarget);
        assertEquals(jsonArrayTarget.toString(), res2.toString());
    }

    @Test
    void replaceUriSpecialChar() {
        assertEquals("google.com%20", CollectUtil.replaceUriSpecialChar("google.com "));
    }
}