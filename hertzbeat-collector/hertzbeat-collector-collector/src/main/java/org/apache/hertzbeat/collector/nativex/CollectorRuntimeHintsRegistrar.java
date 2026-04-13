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

package org.apache.hertzbeat.collector.nativex;

import java.util.LinkedHashSet;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.memory.netty.NettyAllocationManager;
import org.apache.arrow.vector.types.DateUnit;
import org.apache.arrow.vector.types.FloatingPointPrecision;
import org.apache.arrow.vector.types.IntervalUnit;
import org.apache.arrow.vector.types.MetadataVersion;
import org.apache.arrow.vector.types.TimeUnit;
import org.apache.arrow.vector.types.UnionMode;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.DictionaryEncoding;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.arrow.vector.types.pojo.Schema;
import org.apache.hertzbeat.common.entity.dto.ServerInfo;
import org.springframework.aot.hint.BindingReflectionHintsRegistrar;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.TypeFilter;
import org.springframework.lang.NonNull;
import org.springframework.util.ClassUtils;

/**
 * Registers native binding hints for collector-side message payloads.
 */
@Slf4j
public class CollectorRuntimeHintsRegistrar implements RuntimeHintsRegistrar {

    private static final String JOB_PACKAGE = "org.apache.hertzbeat.common.entity.job";
    private static final String JOB_PROTOCOL_PACKAGE = "org.apache.hertzbeat.common.entity.job.protocol";

    @Override
    public void registerHints(@NonNull RuntimeHints hints, ClassLoader classLoader) {
        BindingReflectionHintsRegistrar bindingRegistrar = new BindingReflectionHintsRegistrar();
        registerType(bindingRegistrar, hints, ServerInfo.class);
        scanBindingPackage(classLoader, bindingRegistrar, hints, JOB_PACKAGE);
        scanBindingPackage(classLoader, bindingRegistrar, hints, JOB_PROTOCOL_PACKAGE);
        hints.reflection().registerType(NettyAllocationManager.class, MemberCategory.DECLARED_FIELDS);
        registerType(bindingRegistrar, hints, Schema.class);
        registerType(bindingRegistrar, hints, Field.class);
        registerType(bindingRegistrar, hints, FieldType.class);
        registerType(bindingRegistrar, hints, DictionaryEncoding.class);
        registerType(bindingRegistrar, hints, DateUnit.class);
        registerType(bindingRegistrar, hints, FloatingPointPrecision.class);
        registerType(bindingRegistrar, hints, IntervalUnit.class);
        registerType(bindingRegistrar, hints, MetadataVersion.class);
        registerType(bindingRegistrar, hints, TimeUnit.class);
        registerType(bindingRegistrar, hints, UnionMode.class);
        for (Class<?> nestedClass : ArrowType.class.getDeclaredClasses()) {
            if (!nestedClass.isAnnotation() && !nestedClass.isInterface()) {
                registerType(bindingRegistrar, hints, nestedClass);
            }
        }
    }

    private void scanBindingPackage(ClassLoader classLoader, BindingReflectionHintsRegistrar bindingRegistrar,
                                    RuntimeHints hints, String basePackage) {
        for (Class<?> clazz : findBindingTypes(basePackage, classLoader)) {
            registerType(bindingRegistrar, hints, clazz);
        }
    }

    private void registerType(BindingReflectionHintsRegistrar bindingRegistrar, RuntimeHints hints, Class<?> clazz) {
        bindingRegistrar.registerReflectionHints(hints.reflection(), clazz);
    }

    private Set<Class<?>> findBindingTypes(String basePackage, ClassLoader classLoader) {
        Set<Class<?>> bindingTypes = new LinkedHashSet<>();
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        TypeFilter includeAll = (metadataReader, metadataReaderFactory) -> true;
        scanner.addIncludeFilter(includeAll);
        for (BeanDefinition candidate : scanner.findCandidateComponents(basePackage)) {
            String className = candidate.getBeanClassName();
            if (className == null) {
                continue;
            }
            try {
                Class<?> clazz = ClassUtils.forName(className, classLoader);
                if (!clazz.isAnnotation() && !clazz.isInterface()) {
                    bindingTypes.add(clazz);
                }
            } catch (Throwable ex) {
                log.debug("Skip native binding hint registration for {}", className, ex);
            }
        }
        return bindingTypes;
    }
}
