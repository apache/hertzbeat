/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import java.lang.reflect.Method;
import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.Pointcut;
import org.springframework.aop.support.AbstractPointcutAdvisor;
import org.springframework.aop.support.AopUtils;
import org.springframework.aop.support.StaticMethodMatcherPointcut;
import org.springframework.core.Ordered;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.interceptor.TransactionAttribute;
import org.springframework.transaction.interceptor.TransactionAttributeSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Admits writable transactional boundaries before Spring opens their transactions. */
public final class MetadataWriteAdmissionAdvisor extends AbstractPointcutAdvisor {

    private static final int ADVISOR_ORDER = Ordered.HIGHEST_PRECEDENCE + 100;

    private final TransactionAttributeSource transactionAttributes;
    private final MetadataWriteAdmissionCoordinator coordinator;
    private final TransactionCompletionPermitRegistry transactionPermits;
    private final boolean repositoryAttributes;
    private final Pointcut pointcut = new TransactionAttributePointcut();
    private final MethodInterceptor advice = this::invoke;

    MetadataWriteAdmissionAdvisor(
            TransactionAttributeSource transactionAttributes,
            MetadataWriteAdmissionCoordinator coordinator,
            TransactionCompletionPermitRegistry transactionPermits,
            boolean repositoryAttributes) {
        this.transactionAttributes = transactionAttributes;
        this.coordinator = coordinator;
        this.transactionPermits = transactionPermits;
        this.repositoryAttributes = repositoryAttributes;
    }

    @Override
    public Pointcut getPointcut() {
        return pointcut;
    }

    @Override
    public MethodInterceptor getAdvice() {
        return advice;
    }

    @Override
    public int getOrder() {
        return ADVISOR_ORDER;
    }

    private Object invoke(org.aopalliance.intercept.MethodInvocation invocation) throws Throwable {
        TransactionAttribute attribute = resolveAttribute(invocation.getMethod(), invocation.getThis());
        if (attribute == null || attribute.isReadOnly()) {
            return invocation.proceed();
        }
        if (transactionPermits.hasPermit()) {
            return invocation.proceed();
        }
        if (joinsExistingPhysicalTransaction(attribute)) {
            MetadataWriteAdmissionCoordinator.TransactionPermit permit = coordinator.admitWritableTransaction();
            transactionPermits.bind(permit);
            transactionPermits.beginInvocation();
            try {
                return invocation.proceed();
            } finally {
                transactionPermits.endInvocation();
            }
        }
        try (MetadataWriteAdmissionCoordinator.TransactionPermit permit = coordinator.admitWritableTransaction()) {
            transactionPermits.beginInvocation();
            try {
                return invocation.proceed();
            } finally {
                transactionPermits.endInvocation();
            }
        }
    }

    private TransactionAttribute resolveAttribute(Method method, Object target) {
        Class<?> targetClass = target == null ? method.getDeclaringClass() : AopUtils.getTargetClass(target);
        return transactionAttributes.getTransactionAttribute(method, targetClass);
    }

    private boolean joinsExistingPhysicalTransaction(TransactionAttribute attribute) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            return false;
        }
        return switch (attribute.getPropagationBehavior()) {
            case TransactionDefinition.PROPAGATION_REQUIRED,
                    TransactionDefinition.PROPAGATION_SUPPORTS,
                    TransactionDefinition.PROPAGATION_MANDATORY,
                    TransactionDefinition.PROPAGATION_NESTED -> true;
            default -> false;
        };
    }

    private final class TransactionAttributePointcut extends StaticMethodMatcherPointcut {

        @Override
        public boolean matches(Method method, Class<?> targetClass) {
            return (repositoryAttributes || !Repository.class.isAssignableFrom(targetClass))
                    && transactionAttributes.getTransactionAttribute(method, targetClass) != null;
        }
    }

}
