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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.time.Duration;
import java.util.List;
import java.util.Properties;
import javax.sql.DataSource;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.hibernate.SpringImplicitNamingStrategy;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

/**
 * Verifies that PostgreSQL large-object message reads are enclosed in repository transactions.
 */
class ChatMessageDaoPostgresqlTransactionTest {

    private static final DockerImageName IMAGE = DockerImageName.parse("postgres:17-alpine");

    private static final String PASSWORD = "postgres123";

    private static final int POSTGRESQL_PORT = 5432;

    private static GenericContainer<?> container;

    private static AnnotationConfigApplicationContext context;

    @BeforeAll
    static void startContext() {
        assumeTrue(DockerClientFactory.instance().isDockerAvailable(),
                "a Docker daemon is required to verify PostgreSQL large-object reads");
        container = new GenericContainer<>(IMAGE)
                .withExposedPorts(POSTGRESQL_PORT)
                .withEnv("POSTGRES_PASSWORD", PASSWORD)
                .waitingFor(Wait.forListeningPort().withStartupTimeout(Duration.ofMinutes(5)));
        container.start();
        context = new AnnotationConfigApplicationContext(PostgresqlJpaConfiguration.class);
    }

    @AfterAll
    static void stopContext() {
        if (context != null) {
            context.close();
            context = null;
        }
        if (container != null) {
            container.stop();
            container = null;
        }
    }

    @Test
    void messageQueriesReadPostgresqlLobsOutsideCallerTransaction() {
        ChatConversationDao conversationDao = context.getBean(ChatConversationDao.class);
        ChatMessageDao messageDao = context.getBean(ChatMessageDao.class);
        TransactionTemplate transactionTemplate = context.getBean(TransactionTemplate.class);

        ChatConversation conversation = transactionTemplate.execute(status -> conversationDao.save(
                ChatConversation.builder().title("PostgreSQL LOB transaction test").build()));
        ChatMessage message = transactionTemplate.execute(status -> messageDao.save(
                ChatMessage.builder()
                    .conversationId(conversation.getId())
                    .role("user")
                    .content("message stored as a PostgreSQL large object")
                    .build()));

        List<ChatMessage> messages = messageDao.findByConversationIdOrderByGmtCreateAsc(conversation.getId());
        List<ChatMessage> messagesByIds = messageDao.findByConversationIdInOrderByGmtCreateAsc(
                List.of(conversation.getId()));

        assertEquals(message.getContent(), messages.getFirst().getContent());
        assertEquals(message.getContent(), messagesByIds.getFirst().getContent());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableJpaRepositories(basePackageClasses = ChatMessageDao.class)
    @EnableTransactionManagement
    static class PostgresqlJpaConfiguration {

        @Bean
        DataSource dataSource() {
            DriverManagerDataSource dataSource = new DriverManagerDataSource(
                    "jdbc:postgresql://" + container.getHost() + ":" + container.getMappedPort(POSTGRESQL_PORT)
                            + "/postgres",
                    "postgres", PASSWORD);
            dataSource.setDriverClassName("org.postgresql.Driver");
            return dataSource;
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("org.apache.hertzbeat.common.entity.ai");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            Properties properties = new Properties();
            properties.setProperty("hibernate.hbm2ddl.auto", "create-drop");
            properties.setProperty("hibernate.implicit_naming_strategy", SpringImplicitNamingStrategy.class.getName());
            properties.setProperty("hibernate.physical_naming_strategy",
                    CamelCaseToUnderscoresNamingStrategy.class.getName());
            factory.setJpaProperties(properties);
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory entityManagerFactory) {
            return new JpaTransactionManager(entityManagerFactory);
        }

        @Bean
        TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
            return new TransactionTemplate(transactionManager);
        }
    }
}
