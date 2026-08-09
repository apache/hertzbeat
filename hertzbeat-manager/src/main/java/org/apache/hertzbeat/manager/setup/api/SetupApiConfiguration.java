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

package org.apache.hertzbeat.manager.setup.api;

import java.io.IOException;
import java.net.InetAddress;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigDeploymentDetector;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.identity.DatabaseAccountRepository;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.apache.hertzbeat.manager.setup.installation.InstallationCompletionService;
import org.apache.hertzbeat.manager.setup.installation.InstallationRecordRepository;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;
import org.apache.hertzbeat.manager.setup.runtime.FileSetupTransitionIntentStore;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.apache.hertzbeat.manager.setup.runtime.SetupResponseTransition;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransitionScheduler;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore;
import org.apache.hertzbeat.manager.setup.security.RemoteSetupUnlock;
import org.apache.hertzbeat.manager.setup.security.SetupHttpUnlockService;
import org.apache.hertzbeat.manager.setup.unattended.SetupPasswordFileLoader;
import org.apache.hertzbeat.manager.setup.unattended.UnattendedSetupInitializer;
import org.apache.hertzbeat.manager.setup.workflow.DefaultSetupWorkflow;
import org.apache.hertzbeat.manager.setup.workflow.HeadlessSetupCoordinator;
import org.apache.hertzbeat.manager.setup.workflow.SetupCompletionCoordinator;
import org.apache.hertzbeat.manager.setup.workflow.SetupConfigurationCoordinator;
import org.apache.hertzbeat.manager.setup.workflow.SetupExportRenderer;
import org.apache.hertzbeat.manager.setup.workflow.SetupMutationSerializer;
import org.apache.hertzbeat.manager.setup.workflow.SetupOperationRegistry;
import org.apache.hertzbeat.manager.setup.workflow.SetupOptionsCoordinator;
import org.apache.hertzbeat.manager.setup.workflow.HeadlessSetupWorkflow;
import org.apache.hertzbeat.manager.setup.workflow.SetupRequestValidator;
import org.apache.hertzbeat.manager.setup.workflow.SetupRuntimeState;
import org.apache.hertzbeat.manager.setup.workflow.SetupTransitionService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;

/** Minimal setup assembly shared by setup-only and full setup-gated contexts. */
@Configuration(proxyBeanMethods = false)
@Import({SetupController.class, SetupExceptionHandler.class})
public class SetupApiConfiguration {
    @Bean
    public ManagedConfigCapability setupManagedConfigCapability(Environment environment) {
        return new ManagedConfigDeploymentDetector(SetupInstallationPaths.root(environment)).detect();
    }

    @Bean
    public SetupOperationRegistry setupOperationRegistry(Environment environment, SetupRuntimeState state) {
        return new SetupOperationRegistry(Clock.systemUTC(), SetupInstallationPaths.root(environment), state.phase());
    }

    @Bean
    public SetupResponseTransition setupResponseTransition() {
        return new SetupResponseTransition();
    }

    @Bean(destroyMethod = "close")
    public SetupRuntimeTransitionScheduler setupRuntimeTransitionScheduler(
            SetupRuntimeTransition transition, SetupTransitionIntentStore intents) {
        ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(
                Thread.ofPlatform().name("setup-runtime-transition").factory());
        return new SetupRuntimeTransitionScheduler(transition, intents, executor);
    }

    @Bean
    public SetupTransitionIntentStore setupTransitionIntentStore(Environment environment) {
        return new FileSetupTransitionIntentStore(SetupInstallationPaths.root(environment));
    }

    @Bean
    public SetupRequestValidator setupRequestValidator() {
        return new SetupRequestValidator(Clock.systemUTC());
    }

    @Bean
    public SetupExportRenderer setupExportRenderer() {
        return new SetupExportRenderer();
    }

    @Bean
    public SetupConfigurationCoordinator setupConfigurationCoordinator(
            Environment environment, SetupOperationRegistry operations) {
        return new SetupConfigurationCoordinator(
                new ManagedConfigurationTransaction(SetupInstallationPaths.root(environment)), operations);
    }

    @Bean
    public SetupRuntimeState setupRuntimeState(Environment environment, BusinessRuntimeGate gate,
                                               ManagedConfigCapability capability,
                                               ObjectProvider<DatabaseAccountRepository> accountProvider,
                                               ObjectProvider<InstallationRecordRepository> installationProvider) {
        Path root = SetupInstallationPaths.root(environment);
        return new SetupRuntimeStateFactory().create(environment, root,
                bindAddress(environment.getProperty("server.address")), gate, capability,
                accountProvider.stream().findFirst(), installationProvider.stream().findFirst());
    }

    @Bean(destroyMethod = "close")
    public SetupHttpUnlockService setupHttpUnlockService(
            Environment environment, SetupRuntimeState state) throws IOException {
        Path installationRoot = SetupInstallationPaths.root(environment);
        Path codeFile = installationRoot.resolve("data/config/setup-unlock-code");
        InetAddress bindAddress = bindAddress(environment.getProperty("server.address"));
        Clock clock = Clock.systemUTC();
        return new SetupHttpUnlockService(new RemoteSetupUnlock(
                installationRoot, codeFile, clock, new SecureRandom()),
                bindAddress, state, clock);
    }

    @Bean
    public SetupMutationSerializer setupMutationSerializer() {
        return new SetupMutationSerializer();
    }

    @Bean
    public SetupOptionsCoordinator setupOptionsCoordinator(Environment environment) {
        return new SetupOptionsCoordinator(new ManagedConfigurationTransaction(
                SetupInstallationPaths.root(environment)));
    }

    @Bean
    public SetupTransitionService setupTransitionService(
            SetupRuntimeState state, SetupRequestValidator validator,
            SetupConfigurationCoordinator configuration, ManagedConfigCapability capability,
            SetupOptionsCoordinator options,
            ObjectProvider<IdentityInitializationService> identityProvider,
            ObjectProvider<InstallationCompletionService> installationProvider,
            SetupTransitionIntentStore transitionIntents, Environment environment) {
        return new SetupTransitionService(state, validator, configuration, capability, options,
                identityProvider.stream().findFirst(),
                completion(environment, installationProvider.stream().findFirst()), transitionIntents);
    }

    @Bean
    public DefaultSetupWorkflow setupWorkflow(SetupRuntimeState state,
                                       SetupRequestValidator validator,
                                       SetupOperationRegistry operations,
                                       SetupMutationSerializer mutations, SetupTransitionService transitions) {
        return new DefaultSetupWorkflow(
                state, validator, operations, Clock.systemUTC(), mutations, transitions);
    }

    @Bean
    public HeadlessSetupWorkflow headlessSetupWorkflow(
            SetupRuntimeState state, SetupMutationSerializer mutations, SetupTransitionService transitions) {
        return new HeadlessSetupCoordinator(state, mutations, transitions);
    }

    @Bean
    public ApplicationRunner unattendedSetupRunner(
            HeadlessSetupWorkflow workflow, Environment environment, SetupRuntimeTransitionScheduler scheduler) {
        UnattendedSetupInitializer initializer = new UnattendedSetupInitializer(
                workflow, environment, new SetupPasswordFileLoader(), scheduler);
        return arguments -> initializer.initialize();
    }

    @Bean
    public ApplicationRunner completedInstallationConvergenceRunner(
            BusinessRuntimeGate gate, SetupRuntimeState state, SetupRuntimeTransitionScheduler scheduler) {
        return arguments -> {
            if (gate.mode() == RuntimeMode.FULL_SETUP_GATED && state.phase() == SetupPhase.COMPLETE) {
                scheduler.installationCompleted();
            }
        };
    }

    private Optional<SetupCompletionCoordinator> completion(
            Environment environment, Optional<InstallationCompletionService> installations) {
        Path installationRoot = SetupInstallationPaths.root(environment);
        Path fingerprint = installationRoot.resolve("data/config/.installation-fingerprint");
        return installations.map(service -> new SetupCompletionCoordinator(
                new LocalInstallationFingerprintStore(
                        installationRoot, fingerprint, new SecureRandom()), service));
    }

    static InetAddress bindAddress(String configured) {
        try {
            return configured == null || configured.isBlank()
                    ? InetAddress.getByName("0.0.0.0") : InetAddress.getByName(configured);
        } catch (IOException failure) {
            throw new IllegalStateException("Setup bind address is invalid");
        }
    }
}
