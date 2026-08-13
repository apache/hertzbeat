/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;

/** Child-JVM protocol fixture for deterministic OS owner-lock tests. */
public final class StandaloneDeploymentOwnerProcessMain {

    private StandaloneDeploymentOwnerProcessMain() {
    }

    public static void main(String[] args) throws Exception {
        StartupInstallationRootResolver resolver = new StartupInstallationRootResolver();
        try (StandaloneDeploymentOwner ignored = StandaloneDeploymentOwner.acquire(
                resolver.resolve(new String[] {"--hertzbeat.internal.installation-root=" + Path.of(args[0])}))) {
            System.out.println("LOCKED");
            System.out.flush();
            new BufferedReader(new InputStreamReader(System.in)).readLine();
        } catch (StandaloneDeploymentOwnerException exception) {
            System.out.println("FAILED");
            System.out.flush();
            System.exit(23);
        }
    }
}
