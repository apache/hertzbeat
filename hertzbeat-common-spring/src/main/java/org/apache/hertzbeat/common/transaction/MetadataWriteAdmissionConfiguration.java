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

package org.apache.hertzbeat.common.transaction;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.transaction.interceptor.BeanFactoryTransactionAttributeSourceAdvisor;
import org.springframework.transaction.interceptor.TransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;

/** Spring wiring for process-local metadata write admission. */
@Configuration(proxyBeanMethods = false)
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class MetadataWriteAdmissionConfiguration {

    private static final TransactionAttributeSource NO_TRANSACTION_ATTRIBUTES = (method, targetClass) -> null;

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
            ObjectProvider<BeanFactoryTransactionAttributeSourceAdvisor> transactionAdvisor,
            MetadataWriteAdmissionCoordinator coordinator,
            TransactionCompletionPermitRegistry transactionPermits) {
        TransactionAttributeSource transactionAttributes = transactionAttributes(transactionAdvisor.getIfAvailable());
        return new MetadataWriteAdmissionAdvisor(
                transactionAttributes, coordinator, transactionPermits, false);
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    static SpringDataWriteAdmissionBeanPostProcessor springDataWriteAdmissionBeanPostProcessor(
            ObjectProvider<MetadataWriteAdmissionCoordinator> coordinator,
            ObjectProvider<TransactionCompletionPermitRegistry> transactionPermits) {
        return new SpringDataWriteAdmissionBeanPostProcessor(coordinator, transactionPermits);
    }

    private TransactionAttributeSource transactionAttributes(
            BeanFactoryTransactionAttributeSourceAdvisor transactionAdvisor) {
        if (transactionAdvisor == null || !(transactionAdvisor.getAdvice() instanceof TransactionInterceptor interceptor)) {
            return NO_TRANSACTION_ATTRIBUTES;
        }
        TransactionAttributeSource transactionAttributes = interceptor.getTransactionAttributeSource();
        return transactionAttributes == null ? NO_TRANSACTION_ATTRIBUTES : transactionAttributes;
    }
}
