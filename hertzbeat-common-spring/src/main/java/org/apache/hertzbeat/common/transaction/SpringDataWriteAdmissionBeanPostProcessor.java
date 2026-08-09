/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import org.springframework.aop.Advisor;
import org.springframework.aop.framework.Advised;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.BeanInitializationException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.interceptor.TransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.interceptor.TransactionalProxy;

/** Inserts write admission into each existing Spring Data transaction proxy. */
final class SpringDataWriteAdmissionBeanPostProcessor implements BeanPostProcessor, Ordered {

    private final MetadataWriteAdmissionCoordinator coordinator;
    private final TransactionCompletionPermitRegistry transactionPermits;

    SpringDataWriteAdmissionBeanPostProcessor(
            MetadataWriteAdmissionCoordinator coordinator,
            TransactionCompletionPermitRegistry transactionPermits) {
        this.coordinator = coordinator;
        this.transactionPermits = transactionPermits;
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (!(bean instanceof Repository<?, ?>)
                || !(bean instanceof TransactionalProxy)
                || !(bean instanceof Advised advised)) {
            return bean;
        }
        if (hasAdmissionAdvisor(advised)) {
            return bean;
        }
        if (advised.isFrozen()) {
            throw new BeanInitializationException("Spring Data transaction proxy is frozen");
        }
        int transactionAdvisorIndex = transactionAdvisorIndex(advised);
        TransactionInterceptor interceptor = (TransactionInterceptor) advised
                .getAdvisors()[transactionAdvisorIndex].getAdvice();
        TransactionAttributeSource attributes = interceptor.getTransactionAttributeSource();
        if (attributes == null) {
            throw new BeanInitializationException("Spring Data transaction attributes are unavailable");
        }
        advised.addAdvisor(transactionAdvisorIndex,
                new MetadataWriteAdmissionAdvisor(attributes, coordinator, transactionPermits, true));
        return bean;
    }

    private boolean hasAdmissionAdvisor(Advised advised) {
        for (Advisor advisor : advised.getAdvisors()) {
            if (advisor instanceof MetadataWriteAdmissionAdvisor) {
                return true;
            }
        }
        return false;
    }

    private int transactionAdvisorIndex(Advised advised) {
        int found = -1;
        for (int index = 0; index < advised.getAdvisors().length; index++) {
            if (advised.getAdvisors()[index].getAdvice() instanceof TransactionInterceptor) {
                if (found >= 0) {
                    throw new BeanInitializationException("Spring Data transaction advisor is ambiguous");
                }
                found = index;
            }
        }
        if (found < 0) {
            throw new BeanInitializationException("Spring Data transaction advisor is unavailable");
        }
        return found;
    }
}
