/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.manager.pojo.dto.PublicAccessConfig;
import org.apache.hertzbeat.manager.pojo.dto.PublicAccessConfigRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedOptionalConfiguration;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

class PublicAccessGeneralConfigServiceImplTest {
    @TempDir
    private Path root;

    @Test
    void usesSetupValuesUntilAnOperatorSavesRuntimeConfiguration() throws Exception {
        writeManagedSetup("https://setup.example.test/base");
        GeneralConfigDao dao = inMemoryDao();
        PublicAccessGeneralConfigServiceImpl service = service(dao, new MockEnvironment()
                .withProperty("hertzbeat.instrumentation.server.otlp-http-endpoint", "https://operator.example.test/v1"));

        assertThat(service.getConfig().publicBaseUrl()).isEqualTo("https://setup.example.test/base");

        PublicAccessConfigRequest request = new PublicAccessConfigRequest();
        request.setPublicBaseUrl(" https://runtime.example.test/base ");
        request.setServerOtlpHttpEndpoint("https://otel.example.test/v1");
        PublicAccessConfig saved = service.saveAndGetConfig(request);

        assertThat(saved).isEqualTo(new PublicAccessConfig(
                "https://runtime.example.test/base", "https://otel.example.test/v1", null));
        assertThat(service.getConfig()).isEqualTo(saved);
    }

    @Test
    void persistsAnExplicitEmptyConfigurationInsteadOfFallingBackToSetup() throws Exception {
        writeManagedSetup("https://setup.example.test/base");
        GeneralConfigDao dao = inMemoryDao();
        PublicAccessGeneralConfigServiceImpl service = service(dao, new MockEnvironment()
                .withProperty("hertzbeat.instrumentation.server.otlp-http-endpoint", "https://operator.example.test/v1"));

        PublicAccessConfig saved = service.saveAndGetConfig(new PublicAccessConfigRequest());

        assertThat(saved).isEqualTo(new PublicAccessConfig(null, null, null));
        assertThat(service.getConfig()).isEqualTo(saved);
    }

    @Test
    void readsExistingEnvironmentValuesWhenNoManagedSetupSnapshotExists() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("hertzbeat.setup.public-base-url", "https://environment.example.test/hertzbeat")
                .withProperty("hertzbeat.instrumentation.server.otlp-http-endpoint",
                        "https://otel.example.test/v1");
        PublicAccessGeneralConfigServiceImpl service = service(inMemoryDao(), environment);

        assertThat(service.getConfig()).isEqualTo(new PublicAccessConfig(
                "https://environment.example.test/hertzbeat", "https://otel.example.test/v1", null));
    }

    @Test
    void prefersEffectiveEnvironmentPerKeyWhileKeepingUnloadedManagedFallback() throws Exception {
        writeManagedSetup("https://setup.example.test/base");
        PublicAccessGeneralConfigServiceImpl service = service(inMemoryDao(), new MockEnvironment()
                .withProperty("hertzbeat.setup.public-base-url", "https://operator.example.test/base")
                .withProperty("hertzbeat.instrumentation.server.otlp-http-endpoint", "https://operator.example.test/v1"));

        assertThat(service.getConfig()).isEqualTo(new PublicAccessConfig(
                "https://operator.example.test/base", "https://operator.example.test/v1", "https://setup.example.test:4317"));
    }

    @Test
    void explicitEmptyOrInvalidEnvironmentAddressDoesNotReviveManagedEndpoint() throws Exception {
        writeManagedSetup("https://setup.example.test/base");
        for (String endpoint : new String[] {"", "not-an-endpoint"}) {
            PublicAccessGeneralConfigServiceImpl service = service(inMemoryDao(), new MockEnvironment()
                    .withProperty("hertzbeat.instrumentation.server.otlp-http-endpoint", endpoint)
                    .withProperty("hertzbeat.instrumentation.server.otlp-grpc-endpoint", ""));

            assertThat(service.getConfig()).isEqualTo(new PublicAccessConfig("https://setup.example.test/base", null, null));
        }
    }

    @Test
    void ignoresInvalidFallbackAddressesInsteadOfAdvertisingThem() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("hertzbeat.setup.public-base-url", "http://0.0.0.0:1157")
                .withProperty("hertzbeat.instrumentation.server.otlp-http-endpoint", "not-an-endpoint");
        PublicAccessGeneralConfigServiceImpl service = service(inMemoryDao(), environment);

        assertThat(service.getConfig()).isEqualTo(new PublicAccessConfig(null, null, null));
    }

    @Test
    void rejectsInvalidAndUnknownInputBeforeWriting() {
        GeneralConfigDao dao = mock(GeneralConfigDao.class);
        PublicAccessGeneralConfigServiceImpl service = service(dao, new MockEnvironment());
        PublicAccessConfigRequest invalid = new PublicAccessConfigRequest();
        invalid.setPublicBaseUrl("http://0.0.0.0:1157");
        assertThatThrownBy(() -> service.saveAndGetConfig(invalid))
                .isInstanceOf(IllegalArgumentException.class);

        PublicAccessConfigRequest expanded = new PublicAccessConfigRequest();
        expanded.markUnknownField("password", "secret");
        assertThatThrownBy(() -> service.saveAndGetConfig(expanded))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(dao);
    }

    private PublicAccessGeneralConfigServiceImpl service(GeneralConfigDao dao, MockEnvironment environment) {
        environment.setProperty(SetupInstallationPaths.ROOT_PROPERTY, root.toString());
        return new PublicAccessGeneralConfigServiceImpl(dao, environment);
    }

    private static GeneralConfigDao inMemoryDao() {
        GeneralConfigDao dao = mock(GeneralConfigDao.class);
        AtomicReference<GeneralConfig> stored = new AtomicReference<>();
        when(dao.findByType(GeneralConfigTypeEnum.public_access.name())).thenAnswer(ignored -> stored.get());
        doAnswer(invocation -> {
            stored.set(invocation.getArgument(0));
            return stored.get();
        }).when(dao).save(any(GeneralConfig.class));
        return dao;
    }

    private void writeManagedSetup(String publicBaseUrl) throws Exception {
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(MetadataDatabaseKind.H2, "jdbc:h2:./data/hertzbeat", "sa"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("localhost:4001", "http://localhost:4000"), "public"),
                new ManagedOptionalConfiguration(
                        Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                                Optional.of(publicBaseUrl), Optional.of("https://setup.example.test/v1"),
                                Optional.of("https://setup.example.test:4317"))),
                        Optional.empty(), Optional.empty()));
        ManagedConfigurationBundle bundle = new ManagedConfigurationBundle(
                application, ManagedSecrets.withoutTelemetryPassword(SecretValue.of("database-secret")));
        assertThat(new ManagedConfigurationTransaction(root).apply(bundle))
                .isEqualTo(ManagedConfigurationTransaction.Outcome.APPLIED);
    }
}
