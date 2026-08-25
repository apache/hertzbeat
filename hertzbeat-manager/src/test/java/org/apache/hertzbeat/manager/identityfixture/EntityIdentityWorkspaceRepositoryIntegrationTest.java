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

package org.apache.hertzbeat.manager.identityfixture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.sql.DataSource;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = EntityIdentityWorkspaceRepositoryIntegrationTest.TestConfiguration.class)
@Transactional
class EntityIdentityWorkspaceRepositoryIntegrationTest {

    @PersistenceContext
    private EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    private TestEntityIdentityRepository repository;

    @org.springframework.beans.factory.annotation.Autowired
    private TestObserveEntityRepository entityRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private TestEntityMonitorBindRepository bindRepository;

    @Test
    void workspaceAndEntityOwnerJoinNeverReturnsForeignIdentities() {
        persistEntity(71L, "team-a", "checkout-a");
        persistEntity(72L, "team-b", "checkout-b");
        persistIdentity(71L, "checkout");
        persistIdentity(72L, "checkout");
        entityManager.flush();
        entityManager.clear();

        List<EntityIdentity> owned = repository.findAllOwnedByWorkspaceIdAndEntityId("team-a", 71L);

        assertEquals(1, owned.size());
        assertEquals(71L, owned.getFirst().getEntityId());
        assertTrue(repository.findAllOwnedByWorkspaceIdAndEntityId("team-a", 72L).isEmpty());
    }

    @Test
    void workspaceOwnerJoinsScopeIdentityMatchingEntityBulkReadAndBindCount() {
        persistEntity(81L, "team-a", "shared-a");
        persistEntity(82L, "team-b", "shared-b");
        persistIdentity(81L, "shared");
        persistIdentity(82L, "shared");
        persistBind(81L, 9101L);
        persistBind(82L, 9102L);
        entityManager.flush();
        entityManager.clear();

        List<EntityIdentity> matched = repository
                .findAllOwnedByWorkspaceIdAndIdentityKeyInAndNormalizedValueIn(
                        "team-a", Set.of("service.name"), Set.of("shared"));

        assertEquals(List.of(81L), matched.stream().map(EntityIdentity::getEntityId).toList());
        assertEquals(1L, repository.countDistinctOwnedEntityIdsByWorkspaceIdAndIdentityKeyIn(
                "team-a", Set.of("service.name")));
        assertEquals(List.of(81L), entityRepository
                .findAllByWorkspaceIdAndIdIn("team-a", List.of(81L, 82L)).stream()
                .map(ObserveEntity::getId)
                .toList());
        assertEquals(1L, bindRepository.countOwnedByWorkspaceIdAndEntityId("team-a", 81L));
        assertEquals(0L, bindRepository.countOwnedByWorkspaceIdAndEntityId("team-a", 82L));
    }

    private void persistEntity(long id, String workspaceId, String name) {
        entityManager.persist(ObserveEntity.builder()
                .id(id)
                .workspaceId(workspaceId)
                .type("service")
                .name(name)
                .status("active")
                .source("test")
                .build());
    }

    private void persistIdentity(long entityId, String value) {
        entityManager.persist(EntityIdentity.builder()
                .entityId(entityId)
                .identityType("otel_resource")
                .identityKey("service.name")
                .identityValue(value)
                .normalizedValue(value)
                .priority(100)
                .primaryIdentity(true)
                .build());
    }

    private void persistBind(long entityId, long monitorId) {
        entityManager.persist(EntityMonitorBind.builder()
                .entityId(entityId)
                .monitorId(monitorId)
                .bindType("manual")
                .bindSource("test")
                .status("active")
                .score(100)
                .build());
    }

    interface TestEntityIdentityRepository extends EntityIdentityDao {
    }

    interface TestObserveEntityRepository extends ObserveEntityDao {
    }

    interface TestEntityMonitorBindRepository extends EntityMonitorBindDao {
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @EnableJpaRepositories(
            considerNestedRepositories = true,
            basePackageClasses = EntityIdentityWorkspaceRepositoryIntegrationTest.class)
    static class TestConfiguration {

        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource(
                    "jdbc:h2:mem:entity-identity-workspace;DB_CLOSE_DELAY=-1", "sa", "");
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan(EntityIdentityWorkspaceRepositoryIntegrationTest.class.getPackageName());
            factory.setPersistenceUnitPostProcessors(persistenceUnit -> {
                persistenceUnit.addManagedClassName(EntityIdentity.class.getName());
                persistenceUnit.addManagedClassName(EntityMonitorBind.class.getName());
                persistenceUnit.addManagedClassName(ObserveEntity.class.getName());
            });
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }
    }
}
