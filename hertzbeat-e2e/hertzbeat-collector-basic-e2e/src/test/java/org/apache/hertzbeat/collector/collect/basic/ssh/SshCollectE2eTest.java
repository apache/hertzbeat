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

package org.apache.hertzbeat.collector.collect.basic.ssh;

import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.common.MetricsDataBuilder;
import org.apache.hertzbeat.collector.collect.ssh.SshCollectImpl;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorWriterImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * End-to-end test class for SSH collector
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
public class SshCollectE2eTest {
    private static final String UBUNTU_IMAGE = "rastasheep/ubuntu-sshd:18.04";
    private static final String HOST = "127.0.0.1";
    private static final String ROOT_USER = "root";
    private static final int SSH_PORT = 22;
    private static final int PASSWORD_LENGTH = 12;

    private static GenericContainer<?> linuxContainer;

    @InjectMocks
    private AppServiceImpl appService;

    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    private SshCollectImpl sshCollect;
    private Metrics metrics;
    private Integer mappedPort;
    private String password;

    @AfterAll
    public static void tearDown() {
        if (linuxContainer != null) {
            linuxContainer.stop();
        }
    }

    @BeforeEach
    public void setUp() throws Exception {
        // Initialize services and components
        appService.run();
        sshCollect = new SshCollectImpl();
        metrics = new Metrics();
        password = generateRandomPassword();

        // Set up and start container
        setupAndStartContainer();

        // Set root password
        setContainerRootPassword();

        mappedPort = linuxContainer.getMappedPort(SSH_PORT);
        log.info("Container started successfully with mapped port: {}", mappedPort);
    }

    @SneakyThrows
    @Test
    public void testSshCollect() {
        // Verify container running status
        Assertions.assertTrue(linuxContainer.isRunning(), "Ubuntu container should be running");

        // Get Ubuntu app definition
        Job ubuntuJob = appService.getAppDefine("ubuntu");
        List<Metrics> metricsDefinitions = ubuntuJob.getMetrics();

        for (Metrics metricsDefinition : metricsDefinitions) {
            testMetricsCollection(metricsDefinition);
        }
    }

    private void testMetricsCollection(Metrics metricsDef) throws Exception {
        String name = metricsDef.getName();

        final CollectRep.MetricsData metricsData = executeCollection(metricsDef);
        try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
            Assertions.assertTrue(arrowVectorReader.getRowCount() > 0, name + " metrics values should not be empty");

            // Verify CPU metrics
            RowWrapper firstRowWrapper = arrowVectorReader.readRow().nextRow();
            firstRowWrapper.cellStream().forEach(cell -> Assertions.assertFalse(cell.getValue().isEmpty(),
                    String.format("%s metric column %s should not be empty", name, cell.getField().getName())));
        }

        log.info("{} metrics validation passed", name);
    }

    private CollectRep.MetricsData executeCollection(Metrics metricsDef) {
        // Build SSH protocol configuration
        SshProtocol sshProtocol = buildSshProtocol(metricsDef);
        metrics.setSsh(sshProtocol);

        // Set field aliases
        metrics.setAliasFields(metricsDef.getAliasFields() == null ? metricsDef.getFields().stream()
                        .map(Metrics.Field::getField)
                        .collect(Collectors.toList()) :
                metricsDef.getAliasFields());

        // Execute collection
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder().setId(0L).setApp("ubuntu");
        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            sshCollect.collect(metricsDataBuilder, metrics);
            return metricsDataBuilder.build();
        }
    }

    private SshProtocol buildSshProtocol(Metrics metricsDef) {
        SshProtocol sshProtocol = new SshProtocol();
        sshProtocol.setHost(HOST);
        sshProtocol.setPort(mappedPort.toString());
        sshProtocol.setUsername(ROOT_USER);
        sshProtocol.setPassword(password);
        sshProtocol.setScript(metricsDef.getSsh().getScript());
        sshProtocol.setParseType(metricsDef.getSsh().getParseType());
        return sshProtocol;
    }

    private void setupAndStartContainer() {
        Network network = Network.builder().build();
        linuxContainer = new GenericContainer<>(DockerImageName.parse(UBUNTU_IMAGE))
                .withExposedPorts(SSH_PORT)
                .withNetwork(network)
                .withNetworkAliases("ubuntu")
                .waitingFor(Wait.forListeningPort())
                .withCommand("/usr/sbin/sshd", "-D")
                .withStartupTimeout(Duration.ofSeconds(30));

        Startables.deepStart(Stream.of(linuxContainer)).join();
    }

    private void setContainerRootPassword() throws Exception {
        linuxContainer.execInContainer("bash", "-c",
                String.format("echo 'root:%s' | chpasswd", password));
    }

    private String generateRandomPassword() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder password = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            password.append(characters.charAt(random.nextInt(characters.length())));
        }
        return password.toString();
    }
}