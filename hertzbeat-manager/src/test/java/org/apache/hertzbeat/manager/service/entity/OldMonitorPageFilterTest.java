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

package org.apache.hertzbeat.manager.service.entity;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Executes monitor filter specifications against H2 to verify their result sets.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorPageFilterTest {

    private static SessionFactory sessionFactory;

    @Mock
    private MonitorDao monitorDao;

    @InjectMocks
    private OldMonitorPageQueryService queryService;

    private Session session;

    @BeforeAll
    static void createDatabase() {
        sessionFactory = new Configuration()
                .addAnnotatedClass(Monitor.class)
                .setProperty("hibernate.connection.driver_class", "org.h2.Driver")
                .setProperty("hibernate.connection.url", "jdbc:h2:mem:monitor_filter_test")
                .setProperty("hibernate.hbm2ddl.auto", "create-drop")
                .buildSessionFactory();
    }

    @AfterAll
    static void closeDatabase() {
        if (sessionFactory != null) {
            sessionFactory.close();
        }
    }

    @BeforeEach
    void seedMonitors() {
        session = sessionFactory.openSession();
        session.beginTransaction();
        session.persist(monitor(1L, "Web production", "127.0.0.1", "website", (byte) 1, "prod"));
        session.persist(monitor(2L, "Web testing", "127.0.0.2", "website", (byte) 1, "test"));
        session.persist(monitor(3L, "Database", "127.0.0.8", "mysql", (byte) 1, "prod"));
        session.persist(monitor(4L, "Paused endpoint", "web.example.com", "website", (byte) 0, "prod"));
        session.flush();
        SimpleJpaRepository<Monitor, Long> repository = new SimpleJpaRepository<>(Monitor.class, session);
        when(monitorDao.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(invocation -> {
            Specification<Monitor> specification = invocation.getArgument(0);
            Pageable pageable = invocation.getArgument(1);
            return repository.findAll(specification, pageable);
        });
    }

    @AfterEach
    void rollbackMonitors() {
        if (session != null) {
            session.getTransaction().rollback();
            session.close();
        }
    }

    @Test
    void searchAndLabelsMustBothMatch() {
        assertEquals(List.of(1L, 4L), ids(search("web", "env:prod")));
        assertEquals(List.of(), ids(search("web", "env:missing")));
    }

    @Test
    void eitherFilterCanBeUsedAlone() {
        assertEquals(List.of(1L, 2L), ids(search("WEB", null)));
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", null)));
        assertEquals(List.of(1L, 3L, 4L), ids(search(null, "env:prod")));
        assertEquals(List.of(1L, 2L, 3L, 4L), ids(search(" ", " ")));
    }

    @Test
    void multipleLabelsRemainAlternativesWithinTheLabelFilter() {
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", "env:prod,env:test")));
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", "env")));
    }

    @Test
    void numericSearchStillMatchesMonitorIdButMustAlsoMatchLabels() {
        assertEquals(List.of(3L), ids(search("3", "env:prod")));
        assertEquals(List.of(), ids(search("3", "env:test")));
    }

    @Test
    void appStatusAndIdsContinueToRestrictTheCombinedFilters() {
        Page<Monitor> result = queryService.findMonitorPage(List.of(1L, 2L, 3L, 4L), "website", "web",
                (byte) 1, "id", "asc", 0, 10, "env:prod");
        assertEquals(List.of(1L), ids(result));

        Page<Monitor> excluded = queryService.findMonitorPage(List.of(2L, 3L, 4L), "website", "web",
                (byte) 1, "id", "asc", 0, 10, "env:prod");
        assertEquals(List.of(), ids(excluded));
    }

    private Page<Monitor> search(String search, String labels) {
        return queryService.findMonitorPage(null, null, search, null, "id", "asc", 0, 10, labels);
    }

    @Test
    void labelSeparatorsAndWhitespaceKeepTheirCurrentMeaning() {
        assertEquals(List.of(1L, 4L), ids(search("web", " env = prod ")));
        assertEquals(List.of(1L, 4L), ids(search("web", " env : prod ")));
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", "env:prod, env = test")));
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", "env= ")));
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", "env: ")));
    }

    @Test
    void blankLabelKeysAreIgnoredWithoutWeakeningOtherFilters() {
        assertEquals(List.of(1L, 2L, 3L, 4L), ids(search(null, ", , : , = ,")));
        assertEquals(List.of(1L, 2L, 4L), ids(search("web", ", , : , = ,")));
        assertEquals(List.of(1L, 4L), ids(search("web", "env:missing, , = ,env=prod")));
        assertEquals(List.of(2L), ids(queryService.findMonitorPage(List.of(2L, 3L, 4L), "website", "web",
                (byte) 1, "id", "asc", 0, 10, ", , : , = ,")));
    }

    @Test
    void labelValuesRetainDelimitersAfterTheFirstSeparator() {
        session.persist(Monitor.builder().id(5L).name("URI endpoint").instance("uri.example").app("website")
                .status((byte) 1).labels(Map.of("endpoint", "http://web.example.com?a=b")).build());
        session.persist(monitor(6L, "Region endpoint", "region.example", "website", (byte) 1, "region=west"));
        session.flush();
        assertEquals(List.of(5L), ids(search("URI", "endpoint:http://web.example.com?a=b")));
        assertEquals(List.of(5L), ids(search("URI", "endpoint=http://web.example.com?a=b")));
        assertEquals(List.of(6L), ids(search("Region", "env=region=west")));
    }

    @Test
    void combinedFiltersAreAppliedBeforePagination() {
        Page<Monitor> first = queryService.findMonitorPage(null, null, "web", null, "id", "asc", 0, 1, "env=prod");
        Page<Monitor> second = queryService.findMonitorPage(null, null, "web", null, "id", "asc", 1, 1, "env=prod");
        assertEquals(List.of(1L), ids(first));
        assertEquals(List.of(4L), ids(second));
        assertEquals(2L, first.getTotalElements());
        assertEquals(2L, second.getTotalElements());
    }

    private List<Long> ids(Page<Monitor> page) {
        return page.stream().map(Monitor::getId).toList();
    }

    private Monitor monitor(long id, String name, String instance, String app, byte status, String environment) {
        return Monitor.builder().id(id).name(name).instance(instance).app(app).status(status)
                .labels(Map.of("env", environment)).build();
    }
}
