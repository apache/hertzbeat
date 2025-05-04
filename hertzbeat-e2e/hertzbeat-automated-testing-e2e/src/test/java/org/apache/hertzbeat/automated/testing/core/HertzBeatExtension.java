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

package org.apache.hertzbeat.automated.testing.core;

import org.apache.commons.lang3.ThreadUtils;
import org.apache.hertzbeat.automated.testing.common.HertzBeat;
import org.apache.hertzbeat.automated.testing.pages.login.LoginPage;
import org.apache.hertzbeat.automated.testing.pages.more.SettingsNavPage;
import org.apache.hertzbeat.automated.testing.pages.more.settings.SystemConfigurationPage;
import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestInstancePostProcessor;
import org.openqa.selenium.PageLoadStrategy;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.Testcontainers;
import org.testcontainers.containers.BrowserWebDriverContainer;
import org.testcontainers.containers.ComposeContainer;
import org.testcontainers.containers.VncRecordingContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.shaded.org.awaitility.Awaitility;
import org.testcontainers.utility.DockerImageName;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.net.URL;
import java.nio.file.Files;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.hertzbeat.automated.testing.common.Constants.HERTZBEAT_PASSWORD;
import static org.apache.hertzbeat.automated.testing.common.Constants.HERTZBEAT_USERNAME;
import static org.apache.hertzbeat.automated.testing.common.Constants.HERTZBEAT_PORT;
import static org.apache.hertzbeat.automated.testing.common.Constants.COMPOSE_HERTZBEAT;

/**
 * manage the lifecycle of test instances / containers
 */
public class HertzBeatExtension implements BeforeAllCallback, AfterAllCallback, TestInstancePostProcessor {
    private static final Logger log = LoggerFactory.getLogger(HertzBeatExtension.class);

    private String recordingPath = System.getProperty("user.dir") + File.separator + "target/videos/";
    private BrowserWebDriverContainer<?> browser;
    private RemoteWebDriver driver;
    private ComposeContainer compose;
    private NavBarPage navBarPage;

    @Override
    public void postProcessTestInstance(Object testInstance, ExtensionContext extensionContext) {
        setRecordingPath(recordingPath);

        setComposeContainer(extensionContext);
        compose.start();

        setBrowserWebDriverContainer();
        browser.start();

        Testcontainers.exposeHostPorts(compose.getServicePort(COMPOSE_HERTZBEAT, HERTZBEAT_PORT));
        log.info("HertzBeat port started at: " + compose.getServicePort(COMPOSE_HERTZBEAT, HERTZBEAT_PORT));
        ThreadUtils.sleepQuietly(Duration.ofSeconds(5));

        ChromeOptions options = new ChromeOptions();
        options.setExperimentalOption("excludeSwitches", Collections.singletonList("enable-automation"));
        options.addArguments("--incognito");
        options.setPageLoadStrategy(PageLoadStrategy.NORMAL);
        driver = new RemoteWebDriver(browser.getSeleniumAddress(), options);
        driver.manage().window().maximize();
        driver.manage().timeouts().implicitlyWait(Duration.ZERO).pageLoadTimeout(Duration.ofSeconds(10));
        /* Container network access domain name and port:
         *   host.docker.internal / host.testcontainers.internal
         *   HERTZBEAT_PORT / compose.getServicePort(COMPOSE_HERTZBEAT, HERTZBEAT_PORT)
         */
        driver.get("http://host.testcontainers.internal:" + compose.getServicePort(COMPOSE_HERTZBEAT, HERTZBEAT_PORT));

        browser.beforeTest(new TestDescription(extensionContext));
        log.info("HertzBeat page title: " + driver.getTitle());

        setup();
        Stream.of(testInstance.getClass().getDeclaredFields())
                .filter(f -> NavBarPage.class.isAssignableFrom(f.getType()))
                .forEach(page -> setNavBarPage(testInstance, page));
    }

    @Override
    public void beforeAll(ExtensionContext extensionContext) {
        Awaitility.setDefaultTimeout(Duration.ofSeconds(30));
        Awaitility.setDefaultPollInterval(Duration.ofSeconds(2));
    }

    private void setup() {
        navBarPage = new LoginPage(driver)
                .loginAs(HERTZBEAT_USERNAME, HERTZBEAT_PASSWORD)
                .goToTab(SettingsNavPage.class)
                .goToTab(SystemConfigurationPage.class)
                .setSystemDefaultLanguage()
                .confirmUpdate();
    }

    private void setNavBarPage(Object testInstance, Field page) {
        try {
            page.setAccessible(true);
            page.set(testInstance, navBarPage);
        } catch (IllegalAccessException e) {
            log.error("Failed to inject page: {}", page.getName(), e);
        }
    }

    private void setRecordingPath(String recordingPath) {
        File recordingDir = new File(recordingPath);
        try {
            if (!recordingDir.exists()) {
                boolean isCreated = recordingDir.mkdirs();
                if (isCreated) {
                    log.debug("Recording directory created: " + recordingDir.getAbsolutePath());
                } else {
                    createTempDirectory();
                    log.info("Creation failed, use recording temporary directory: {}", recordingDir.getAbsolutePath());
                }
            } else {
                log.debug("Recording directory already exists: " + recordingDir.getAbsolutePath());
            }
        } catch (Exception e) {
            createTempDirectory();
            log.error("Creation failed, use recording temporary directory: {}", recordingDir.getAbsolutePath(), e);
        }
    }

    private void createTempDirectory() {
        try {
            recordingPath = Files.createTempDirectory("video-").toFile().getAbsolutePath();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private void setBrowserWebDriverContainer() {
        DockerImageName imageName = DockerImageName.parse("selenium/standalone-chrome:116.0-chromedriver-116.0-20250414")
                .asCompatibleSubstituteFor("selenium/standalone-chrome:116.0-chromedriver-116.0");
        int cdpPort = 4444;
        int vncPort = 5900;

        browser = new BrowserWebDriverContainer<>(imageName)
                .withCapabilities(new ChromeOptions())
                .withCreateContainerCmdModifier(cmd -> cmd.withUser("root"))
                .withRecordingMode(
                        BrowserWebDriverContainer.VncRecordingMode.RECORD_ALL,
                        new File(recordingPath),
                        VncRecordingContainer.VncRecordingFormat.FLV
                )
                .withExposedPorts(cdpPort, vncPort)
                .withLogConsumer(outputFrame -> log.info(outputFrame.getUtf8String()))
                .withStartupTimeout(Duration.ofMinutes(10))
                .withAccessToHost(true);
    }

    private void setComposeContainer(ExtensionContext context) {
        Class<?> clazz = context.getRequiredTestClass();
        HertzBeat annotation = clazz.getAnnotation(HertzBeat.class);
        List<File> files = Stream.of(annotation.composeFiles())
                .map(it -> HertzBeat.class.getClassLoader().getResource(it))
                .filter(Objects::nonNull)
                .map(URL::getPath)
                .map(File::new)
                .collect(Collectors.toList());

        compose = new ComposeContainer(files)
                .withPull(true)
                .withTailChildContainers(false)
                .withLocalCompose(true)
                .withStartupTimeout(Duration.ofMinutes(20))
                .withExposedService(
                        COMPOSE_HERTZBEAT,
                        HERTZBEAT_PORT,
                        Wait.forListeningPort().withStartupTimeout(Duration.ofSeconds(60)))
                .withLogConsumer(COMPOSE_HERTZBEAT, outputFrame -> log.info(outputFrame.getUtf8String()));
    }

    @Override
    public void afterAll(ExtensionContext extensionContext) {
        if (browser != null) {
            // Retain screen recordings for test.
            browser.afterTest(new TestDescription(extensionContext), Optional.empty());
            browser.stop();
        }
        if (compose != null) {
            compose.stop();
        }
    }
}
