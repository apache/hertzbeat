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

package org.apache.hertzbeat.manager.service;

import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.Map;
import java.util.UUID;
import org.apache.hertzbeat.alert.util.CryptoUtils;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactoryBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Exercises the production token repository and service against committed H2 transactions. */
class AccountTokenPersistenceTest {

    private static final String TOKEN = "local-token-persistence-fixture";

    private LocalContainerEntityManagerFactoryBean entityManagerFactory;
    private DriverManagerDataSource dataSource;
    private JpaTransactionManager transactionManager;
    private AuthTokenDao tokens;
    private AccountServiceImpl reader;
    private Long tokenId;

    @BeforeEach
    void setUp() {
        dataSource = new DriverManagerDataSource("jdbc:h2:mem:token_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        entityManagerFactory = new LocalContainerEntityManagerFactoryBean();
        entityManagerFactory.setDataSource(dataSource);
        entityManagerFactory.setManagedTypes(PersistenceManagedTypes.of(AuthToken.class.getName()));
        entityManagerFactory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        entityManagerFactory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
        entityManagerFactory.afterPropertiesSet();
        var factory = entityManagerFactory.getObject();
        transactionManager = new JpaTransactionManager(factory);
        var beans = new DefaultListableBeanFactory();
        beans.registerSingleton("transactionManager", transactionManager);
        var repository = new JpaRepositoryFactoryBean<AuthTokenDao, AuthToken, Long>(AuthTokenDao.class);
        repository.setBeanFactory(beans);
        repository.setEntityManager(SharedEntityManagerCreator.createSharedEntityManager(factory));
        repository.afterPropertiesSet();
        tokens = repository.getObject();
        tokenId = tokens.saveAndFlush(AuthToken.builder()
                .tokenHash(CryptoUtils.sha256Hex(TOKEN)).creator("local-admin").build()).getId();
        reader = newService();
    }

    @AfterEach
    void tearDown() {
        SurenessContextHolder.clear();
        if (entityManagerFactory != null) {
            entityManagerFactory.destroy();
        }
        if (dataSource != null) {
            new JdbcTemplate(dataSource).execute("SHUTDOWN");
        }
    }

    @Test
    void committedDeletionIsVisibleToAnAlreadyUsedServiceInstance() throws Exception {
        assertNull(reader.checkTokenStatus(TOKEN));
        SubjectSum admin = mock(SubjectSum.class);
        when(admin.hasRole("admin")).thenReturn(true);
        when(admin.getPrincipal()).thenReturn("local-admin");
        SurenessContextHolder.bindSubject(admin);

        newService().deleteToken(tokenId);

        assertFalse(tokens.existsById(tokenId));
        assertEquals("Token has been revoked", reader.checkTokenStatus(TOKEN));
    }

    @Test
    void committedStatusChangesAreVisibleWithoutRestartingTheService() {
        assertNull(reader.checkTokenStatus(TOKEN));
        AuthToken token = tokens.findById(tokenId).orElseThrow();
        token.setStatus((byte) 1);
        tokens.saveAndFlush(token);

        assertEquals("Token has been revoked", reader.checkTokenStatus(TOKEN));

        token.setStatus((byte) 0);
        tokens.saveAndFlush(token);
        assertNull(reader.checkTokenStatus(TOKEN));
    }

    @Test
    void rolledBackDeletionDoesNotRevokeTheStoredToken() {
        assertNull(reader.checkTokenStatus(TOKEN));
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            tokens.deleteById(tokenId);
            tokens.flush();
            status.setRollbackOnly();
        });

        assertTrue(tokens.existsById(tokenId));
        assertNull(reader.checkTokenStatus(TOKEN));
    }

    @Test
    void missingTokenIsRejectedWithoutChangingOtherTokens() {
        assertEquals("Token has been revoked", reader.checkTokenStatus("missing-local-token"));
        assertTrue(tokens.existsById(tokenId));
        assertNull(reader.checkTokenStatus(TOKEN));
    }

    private AccountServiceImpl newService() {
        var service = new AccountServiceImpl(mock(SurenessAccountProvider.class));
        ReflectionTestUtils.setField(service, "authTokenDao", tokens);
        return service;
    }
}
