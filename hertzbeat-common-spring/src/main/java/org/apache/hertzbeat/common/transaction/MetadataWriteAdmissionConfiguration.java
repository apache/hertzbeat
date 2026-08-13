/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.transaction.interceptor.TransactionAttributeSource;

/** Spring wiring for process-local metadata write admission. */
@Configuration(proxyBeanMethods = false)
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class MetadataWriteAdmissionConfiguration {

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    MetadataWriteAdmissionCoordinator metadataWriteAdmissionCoordinator() {
        return new MetadataWriteAdmissionCoordinator();
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    TransactionCompletionPermitRegistry transactionCompletionPermitRegistry() {
        return new TransactionCompletionPermitRegistry();
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    MetadataWriteAdmissionAdvisor metadataWriteAdmissionAdvisor(
            TransactionAttributeSource transactionAttributeSource,
            MetadataWriteAdmissionCoordinator coordinator,
            TransactionCompletionPermitRegistry transactionPermits) {
        return new MetadataWriteAdmissionAdvisor(
                transactionAttributeSource, coordinator, transactionPermits, false);
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    static SpringDataWriteAdmissionBeanPostProcessor springDataWriteAdmissionBeanPostProcessor(
            MetadataWriteAdmissionCoordinator coordinator,
            TransactionCompletionPermitRegistry transactionPermits) {
        return new SpringDataWriteAdmissionBeanPostProcessor(coordinator, transactionPermits);
    }
}
