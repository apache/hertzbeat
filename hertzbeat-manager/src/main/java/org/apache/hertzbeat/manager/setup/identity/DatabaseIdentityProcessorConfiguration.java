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

package org.apache.hertzbeat.manager.setup.identity;

import com.usthe.sureness.configuration.SurenessProperties;
import com.usthe.sureness.configuration.SurenessProperties.AuthType;
import com.usthe.sureness.processor.DefaultProcessorManager;
import com.usthe.sureness.processor.Processor;
import com.usthe.sureness.processor.ProcessorManager;
import com.usthe.sureness.processor.support.DigestProcessor;
import com.usthe.sureness.processor.support.NoneProcessor;
import com.usthe.sureness.processor.support.SessionProcessor;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Owns Sureness processor construction so BASIC authentication understands persisted BCrypt credentials. */
@Configuration(proxyBeanMethods = false)
public class DatabaseIdentityProcessorConfiguration {
    @Bean
    ProcessorManager databaseIdentityProcessorManager(SurenessProperties properties,
                                                       DatabaseFirstAccountProvider accounts,
                                                       AccountCredentialVerifier verifier) {
        List<Processor> processors = new ArrayList<>();
        processors.add(new NoneProcessor());
        Set<AuthType> authTypes = authTypes(properties);
        if (authTypes.contains(AuthType.JWT)) {
            processors.add(new VersionedJwtProcessor(accounts));
        }
        if (authTypes.contains(AuthType.BASIC)) {
            processors.add(new BcryptPasswordProcessor(accounts, verifier));
        }
        if (authTypes.contains(AuthType.DIGEST)) {
            DigestProcessor digest = new DigestProcessor();
            digest.setAccountProvider(accounts::loadLegacyAccountForDigest);
            processors.add(digest);
        }
        if (properties.getSession() != null && properties.getSession().isEnable()) {
            processors.add(new SessionProcessor());
        }
        return new DefaultProcessorManager(processors);
    }

    static Set<AuthType> authTypes(SurenessProperties properties) {
        if (properties.getAuths() == null || properties.getAuths().length == 0) {
            return Set.of(AuthType.BASIC, AuthType.JWT);
        }
        return new HashSet<>(Arrays.asList(properties.getAuths()));
    }
}
