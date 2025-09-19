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

package org.apache.hertzbeat.common.entity.manager;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link MetricsFavorite}
 */
class MetricsFavoriteTest {

    private final ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private final Validator validator = factory.getValidator();

    @Test
    void testBuilder() {
        String creator = "testUser";
        Long monitorId = 1L;
        String metricsName = "cpu";
        LocalDateTime createTime = LocalDateTime.now();

        MetricsFavorite favorite = MetricsFavorite.builder()
                .id(1L)
                .creator(creator)
                .monitorId(monitorId)
                .metricsName(metricsName)
                .createTime(createTime)
                .build();

        assertNotNull(favorite);
        assertEquals(1L, favorite.getId());
        assertEquals(creator, favorite.getCreator());
        assertEquals(monitorId, favorite.getMonitorId());
        assertEquals(metricsName, favorite.getMetricsName());
        assertEquals(createTime, favorite.getCreateTime());
    }

    @Test
    void testBuilderWithoutOptionalFields() {
        String creator = "testUser";
        Long monitorId = 1L;
        String metricsName = "cpu";

        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator(creator)
                .monitorId(monitorId)
                .metricsName(metricsName)
                .build();

        assertNotNull(favorite);
        assertNull(favorite.getId());
        assertEquals(creator, favorite.getCreator());
        assertEquals(monitorId, favorite.getMonitorId());
        assertEquals(metricsName, favorite.getMetricsName());
        assertNull(favorite.getCreateTime());
    }

    @Test
    void testDefaultConstructor() {
        MetricsFavorite favorite = new MetricsFavorite();

        assertNotNull(favorite);
        assertNull(favorite.getId());
        assertNull(favorite.getCreator());
        assertNull(favorite.getMonitorId());
        assertNull(favorite.getMetricsName());
        assertNull(favorite.getCreateTime());
    }

    @Test
    void testSettersAndGetters() {
        MetricsFavorite favorite = new MetricsFavorite();
        String creator = "testUser";
        Long monitorId = 1L;
        String metricsName = "cpu";
        LocalDateTime createTime = LocalDateTime.now();

        favorite.setId(1L);
        favorite.setCreator(creator);
        favorite.setMonitorId(monitorId);
        favorite.setMetricsName(metricsName);
        favorite.setCreateTime(createTime);

        assertEquals(1L, favorite.getId());
        assertEquals(creator, favorite.getCreator());
        assertEquals(monitorId, favorite.getMonitorId());
        assertEquals(metricsName, favorite.getMetricsName());
        assertEquals(createTime, favorite.getCreateTime());
    }

    @Test
    void testValidation_ValidEntity() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("testUser")
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertTrue(violations.isEmpty());
    }

    @Test
    void testValidation_NullCreator() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator(null)
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("creator")));
    }

    @Test
    void testValidation_BlankCreator() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("   ")
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("creator")));
    }

    @Test
    void testValidation_CreatorTooLong() {
        String longCreator = "a".repeat(256);
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator(longCreator)
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("creator")));
    }

    @Test
    void testValidation_NullMonitorId() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("testUser")
                .monitorId(null)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("monitorId")));
    }

    @Test
    void testValidation_NullMetricsName() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("testUser")
                .monitorId(1L)
                .metricsName(null)
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("metricsName")));
    }

    @Test
    void testValidation_BlankMetricsName() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("testUser")
                .monitorId(1L)
                .metricsName("   ")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("metricsName")));
    }

    @Test
    void testValidation_MetricsNameTooLong() {
        String longMetricsName = "a".repeat(256);
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("testUser")
                .monitorId(1L)
                .metricsName(longMetricsName)
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("metricsName")));
    }

    @Test
    void testEqualsAndHashCode() {
        LocalDateTime now = LocalDateTime.now();
        MetricsFavorite favorite1 = MetricsFavorite.builder()
                .id(1L)
                .creator("testUser")
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(now)
                .build();

        MetricsFavorite favorite2 = MetricsFavorite.builder()
                .id(1L)
                .creator("testUser")
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(now)
                .build();

        MetricsFavorite favorite3 = MetricsFavorite.builder()
                .id(2L)
                .creator("testUser")
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(now)
                .build();

        assertEquals(favorite1, favorite2);
        assertEquals(favorite1.hashCode(), favorite2.hashCode());
        assertNotEquals(favorite1, favorite3);
        assertNotEquals(favorite1.hashCode(), favorite3.hashCode());
    }

    @Test
    void testToString() {
        MetricsFavorite favorite = MetricsFavorite.builder()
                .id(1L)
                .creator("testUser")
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        String toString = favorite.toString();

        assertNotNull(toString);
        assertTrue(toString.contains("MetricsFavorite"));
        assertTrue(toString.contains("testUser"));
        assertTrue(toString.contains("cpu"));
    }

    @Test
    void testCreatorMaxLength() {
        String maxLengthCreator = "a".repeat(255);
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator(maxLengthCreator)
                .monitorId(1L)
                .metricsName("cpu")
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertTrue(violations.isEmpty());
        assertEquals(255, favorite.getCreator().length());
    }

    @Test
    void testMetricsNameMaxLength() {
        String maxLengthMetricsName = "a".repeat(255);
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator("testUser")
                .monitorId(1L)
                .metricsName(maxLengthMetricsName)
                .createTime(LocalDateTime.now())
                .build();

        Set<ConstraintViolation<MetricsFavorite>> violations = validator.validate(favorite);

        assertTrue(violations.isEmpty());
        assertEquals(255, favorite.getMetricsName().length());
    }
}