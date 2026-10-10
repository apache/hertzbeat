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

package org.apache.hertzbeat.startup;

import org.apache.hertzbeat.manager.setup.identity.AdministratorCredentials;
import org.apache.hertzbeat.manager.setup.identity.DatabaseAccountRepository;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.springframework.beans.factory.annotation.Autowired;

/** Shared identity fixture for E2E tests that exercise authenticated public boundaries. */
@TrustedStartup
public abstract class TrustedStartupSupport {

    @Autowired
    private IdentityInitializationService identityInitializationService;

    @Autowired
    private DatabaseAccountRepository databaseAccountRepository;

    protected final void initializeAdministrator() {
        if (!databaseAccountRepository.existsByUsername("admin")) {
            identityInitializationService.createFirstAdministrator(
                    new AdministratorCredentials("admin", "hertzbeat".toCharArray()));
        }
    }
}
