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

package org.apache.hertzbeat.manager.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.util.List;
import org.apache.hertzbeat.manager.dao.CollectorDao.CollectorStatusInventory;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

/** Freezes the projection-only single-query Collector inventory boundary. */
class CollectorStatusInventoryContractTest {

    @Test
    void inventoryQueryUsesNameStatusProjection() throws NoSuchMethodException {
        Method method = CollectorDao.class.getMethod("findStatusInventory");
        Query query = method.getAnnotation(Query.class);

        assertEquals(List.class, method.getReturnType());
        assertEquals(CollectorStatusInventory.class,
                ((java.lang.reflect.ParameterizedType) method.getGenericReturnType()).getActualTypeArguments()[0]);
        assertTrue(query.value().contains("c.name as name"));
        assertTrue(query.value().contains("c.status as status"));
        assertFalse(query.value().contains("runtimeConfig"));
        assertFalse(query.value().contains("instrumentationIntake"));
    }
}
