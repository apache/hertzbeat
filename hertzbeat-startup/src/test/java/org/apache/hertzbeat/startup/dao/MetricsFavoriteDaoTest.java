/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.startup.dao;

import jakarta.annotation.Resource;
import org.apache.hertzbeat.common.entity.manager.MetricsFavorite;
import org.apache.hertzbeat.manager.dao.MetricsFavoriteDao;
import org.apache.hertzbeat.startup.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link MetricsFavoriteDao}
 */
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MetricsFavoriteDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private MetricsFavoriteDao metricsFavoriteDao;

    private MetricsFavorite testFavorite1;
    private MetricsFavorite testFavorite2;
    private MetricsFavorite testFavorite3;

    private final String testCreator1 = "user1";
    private final String testCreator2 = "user2";
    private final Long testMonitorId1 = 1L;
    private final Long testMonitorId2 = 2L;
    private final String testMetricsName1 = "cpu";
    private final String testMetricsName2 = "memory";

    @BeforeEach
    void setUp() {
        testFavorite1 = MetricsFavorite.builder()
                .creator(testCreator1)
                .monitorId(testMonitorId1)
                .metricsName(testMetricsName1)
                .createTime(LocalDateTime.now())
                .build();
        testFavorite2 = MetricsFavorite.builder()
                .creator(testCreator1)
                .monitorId(testMonitorId1)
                .metricsName(testMetricsName2)
                .createTime(LocalDateTime.now())
                .build();
        testFavorite3 = MetricsFavorite.builder()
                .creator(testCreator2)
                .monitorId(testMonitorId2)
                .metricsName(testMetricsName1)
                .createTime(LocalDateTime.now())
                .build();
    }

    @Test
    void testSaveAndFindById() {
        MetricsFavorite saved = metricsFavoriteDao.saveAndFlush(testFavorite1);

        assertNotNull(saved.getId());
        Optional<MetricsFavorite> found = metricsFavoriteDao.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(testCreator1, found.get().getCreator());
        assertEquals(testMonitorId1, found.get().getMonitorId());
        assertEquals(testMetricsName1, found.get().getMetricsName());
    }

    @Test
    void testFindByCreatorAndMonitorIdAndMetricsName() {
        metricsFavoriteDao.saveAndFlush(testFavorite1);

        Optional<MetricsFavorite> found = metricsFavoriteDao
                .findByCreatorAndMonitorIdAndMetricsName(testCreator1, testMonitorId1, testMetricsName1);

        assertTrue(found.isPresent());
        assertEquals(testCreator1, found.get().getCreator());
        assertEquals(testMonitorId1, found.get().getMonitorId());
        assertEquals(testMetricsName1, found.get().getMetricsName());
    }

    @Test
    void testFindByCreatorAndMonitorIdAndMetricsNameNotFound() {
        Optional<MetricsFavorite> found = metricsFavoriteDao.findByCreatorAndMonitorIdAndMetricsName("nonexistent", 999L, "nonexistent");
        assertFalse(found.isPresent());
    }

    @Test
    void testFindByCreatorAndMonitorId() {
        metricsFavoriteDao.saveAndFlush(testFavorite1);
        metricsFavoriteDao.saveAndFlush(testFavorite2);
        metricsFavoriteDao.saveAndFlush(testFavorite3);

        List<MetricsFavorite> found = metricsFavoriteDao.findByCreatorAndMonitorId(testCreator1, testMonitorId1);

        assertNotNull(found);
        assertEquals(2, found.size());
        assertTrue(found.stream().allMatch(f -> f.getCreator().equals(testCreator1)));
        assertTrue(found.stream().allMatch(f -> f.getMonitorId().equals(testMonitorId1)));
        assertTrue(found.stream().anyMatch(f -> f.getMetricsName().equals(testMetricsName1)));
        assertTrue(found.stream().anyMatch(f -> f.getMetricsName().equals(testMetricsName2)));
    }

    @Test
    void testFindByCreatorAndMonitorIdEmptyResult() {
        List<MetricsFavorite> found = metricsFavoriteDao.findByCreatorAndMonitorId("nonexistent", 999L);
        assertNotNull(found);
        assertTrue(found.isEmpty());
    }

    @Test
    void testDeleteByUserIdAndMonitorIdAndMetricsName() {
        MetricsFavorite saved = metricsFavoriteDao.saveAndFlush(testFavorite1);

        assertTrue(metricsFavoriteDao.findById(saved.getId()).isPresent());

        metricsFavoriteDao.deleteByUserIdAndMonitorIdAndMetricsName(testCreator1, testMonitorId1, testMetricsName1);
        assertFalse(metricsFavoriteDao.findById(saved.getId()).isPresent());
    }

    @Test
    void testDeleteByUserIdAndMonitorIdAndMetricsNameNotExists() {
        // When - Should not throw exception even if record doesn't exist
        assertDoesNotThrow(() -> {
            metricsFavoriteDao.deleteByUserIdAndMonitorIdAndMetricsName("nonexistent", 999L, "nonexistent");
        });
    }

    @Test
    void testDeleteFavoritesByMonitorIdIn() {
        MetricsFavorite saved1 = metricsFavoriteDao.saveAndFlush(testFavorite1);
        MetricsFavorite saved2 = metricsFavoriteDao.saveAndFlush(testFavorite2);
        MetricsFavorite saved3 = metricsFavoriteDao.saveAndFlush(testFavorite3);

        assertEquals(3, metricsFavoriteDao.findAll().size());

        Set<Long> monitorIds = Set.of(testMonitorId1, testMonitorId2);
        metricsFavoriteDao.deleteFavoritesByMonitorIdIn(monitorIds);

        assertEquals(0, metricsFavoriteDao.findAll().size());
        assertFalse(metricsFavoriteDao.findById(saved1.getId()).isPresent());
        assertFalse(metricsFavoriteDao.findById(saved2.getId()).isPresent());
        assertFalse(metricsFavoriteDao.findById(saved3.getId()).isPresent());
    }

    @Test
    void testDeleteFavoritesByMonitorIdInPartialDelete() {
        MetricsFavorite saved1 = metricsFavoriteDao.saveAndFlush(testFavorite1);
        MetricsFavorite saved3 = metricsFavoriteDao.saveAndFlush(testFavorite3);

        Set<Long> monitorIds = Set.of(testMonitorId1);
        metricsFavoriteDao.deleteFavoritesByMonitorIdIn(monitorIds);

        assertEquals(1, metricsFavoriteDao.findAll().size());
        assertFalse(metricsFavoriteDao.findById(saved1.getId()).isPresent());
        assertTrue(metricsFavoriteDao.findById(saved3.getId()).isPresent());
    }

    @Test
    void testDeleteFavoritesByMonitorIdInNonExistentIds() {
        metricsFavoriteDao.saveAndFlush(testFavorite1);

        Set<Long> nonExistentIds = Set.of(999L, 1000L);
        metricsFavoriteDao.deleteFavoritesByMonitorIdIn(nonExistentIds);

        assertEquals(1, metricsFavoriteDao.findAll().size());
    }

    @Test
    void testUniqueConstraint() {
        metricsFavoriteDao.saveAndFlush(testFavorite1);

        MetricsFavorite duplicate = MetricsFavorite.builder()
                .creator(testCreator1)
                .monitorId(testMonitorId1)
                .metricsName(testMetricsName1)
                .createTime(LocalDateTime.now()).build();

        assertThrows(Throwable.class, () -> {
            metricsFavoriteDao.saveAndFlush(duplicate);
        });
    }
}
