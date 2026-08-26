/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.SpringBootContextLoader;
import org.springframework.core.env.StandardEnvironment;

/** Launches E2E Spring tests through the same trusted admission used in production. */
public final class TrustedSpringBootContextLoader extends SpringBootContextLoader {

    @Override
    protected SpringApplication getSpringApplication() {
        Path installationRoot = testInstallationRoot();
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(StartupLaunchAdmission.internalPropertySource(
                StartupDecision.normal(), installationRoot, StartupLaunchAdmission.Mode.ORDINARY));
        SpringApplication application = super.getSpringApplication();
        application.setEnvironment(environment);
        application.addInitializers(context -> context.getBeanFactory().registerSingleton(
                "setupRuntimeTransition", (SetupRuntimeTransition) () -> { }));
        return application;
    }

    private static Path testInstallationRoot() {
        try {
            return Files.createTempDirectory("hertzbeat-e2e-");
        } catch (IOException failure) {
            throw new IllegalStateException("Cannot prepare the E2E installation root", failure);
        }
    }
}
