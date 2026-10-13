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
