/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class MetadataWriteAdmissionConfigurationTest {

    @Test
    void loadsWithoutTransactionInfrastructureWithAnInertAdvisor() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.register(MetadataWriteAdmissionConfiguration.class);
            context.refresh();

            assertThat(context.getBeansOfType(MetadataWriteAdmissionCoordinator.class)).hasSize(1);
            assertThat(context.getBeansOfType(TransactionCompletionPermitRegistry.class)).hasSize(1);
            assertThat(context.getBeansOfType(SpringDataWriteAdmissionBeanPostProcessor.class)).hasSize(1);
            assertThat(context.getBeansOfType(MetadataWriteAdmissionAdvisor.class)).hasSize(1);
        }
    }
}
