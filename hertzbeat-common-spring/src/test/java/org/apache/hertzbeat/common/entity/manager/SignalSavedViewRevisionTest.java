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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SignalSavedViewRevisionTest {
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void overlappingTransactionsCannotOverwriteOrDeleteNewerContent(boolean delete) {
        try (var factory = new Configuration().addAnnotatedClass(SignalSavedViewEntity.class)
                .setProperty("hibernate.connection.driver_class", "org.h2.Driver")
                .setProperty("hibernate.connection.url", "jdbc:h2:mem:saved_revision_" + delete + ";DB_CLOSE_DELAY=-1")
                .setProperty("hibernate.hbm2ddl.auto", "create-drop")
                .setProperty("hibernate.show_sql", "false").buildSessionFactory()) {
            Long id;
            try (var seed = factory.openSession()) {
                var transaction = seed.beginTransaction();
                var entity = SignalSavedViewEntity.builder().creator("operator").signal("logs").viewKey("shared")
                        .label("Original").route("/log/manage").payload("{\"opaque\":true}").build();
                seed.persist(entity);
                transaction.commit();
                id = entity.getId();
                assertEquals(0L, entity.getRevision());
            }
            try (var first = factory.openSession(); var stale = factory.openSession()) {
                var firstTransaction = first.beginTransaction();
                var staleTransaction = stale.beginTransaction();
                var current = first.find(SignalSavedViewEntity.class, id);
                var older = stale.find(SignalSavedViewEntity.class, id);
                current.setLabel("Newer");
                firstTransaction.commit();
                if (delete) {
                    stale.remove(older);
                } else {
                    older.setLabel("Stale");
                }
                assertThrows(OptimisticLockException.class, stale::flush);
                staleTransaction.rollback();
            }
            try (var verify = factory.openSession()) {
                var entity = verify.find(SignalSavedViewEntity.class, id);
                assertEquals("Newer", entity.getLabel());
                assertEquals("{\"opaque\":true}", entity.getPayload());
                assertEquals(1L, entity.getRevision());
            }
        }
    }
}
