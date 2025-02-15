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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.ssh.SshCollectImpl;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.stream.Stream;

/**
 * End-to-end test class for SSH collector
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
public class SshCollectE2eTest extends AbstractCollectE2eTest {
    private static final String UBUNTU_IMAGE = "rastasheep/ubuntu-sshd:18.04";
    private static final String HOST = "127.0.0.1";
    private static final String ROOT_USER = "root";
    private static final int SSH_PORT = 22;
    private static final int PASSWORD_LENGTH = 12;
    private static final List<String> ALLOW_EMPTY_WHITE_LIST = Arrays.asList("top_mem_process", "top_cpu_process");

    private static GenericContainer<?> linuxContainer;

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
        super.setUp();
        collect = new SshCollectImpl();
        password = generateRandomPassword();

        // Set up and start container
        setupAndStartContainer();

        // Set root password
        setContainerRootPassword();

        mappedPort = linuxContainer.getMappedPort(SSH_PORT);
        log.info("Container started successfully with mapped port: {}", mappedPort);
    }

    @Test
    public void testSshCollect() throws ExecutionException, InterruptedException, TimeoutException {
        Assertions.assertTrue(linuxContainer.isRunning(), "Ubuntu container should be running");

        Job ubuntuJob = appService.getAppDefine("ubuntu");
        ubuntuJob.getMetrics().forEach(metricsDef -> {
            if (ALLOW_EMPTY_WHITE_LIST.contains(metricsDef.getName())) {
                validateMetricsCollection(metricsDef, metricsDef.getName(), true);
            } else {
                validateMetricsCollection(metricsDef, metricsDef.getName());
            }
        });
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        // Build SSH protocol configuration
        SshProtocol sshProtocol = (SshProtocol) buildProtocol(metricsDef);
        metrics.setSsh(sshProtocol);
        return collectMetricsData(metrics, metricsDef);
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
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
