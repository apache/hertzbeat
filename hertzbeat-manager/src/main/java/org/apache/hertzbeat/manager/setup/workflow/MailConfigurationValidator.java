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

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.workflow.MetadataConfigurationValidator.Validation;

/** Validates mail credential pairing and reports an explicitly insecure transport. */
final class MailConfigurationValidator {
    Validation validate(MailConfiguration configuration) {
        if (configuration.port() > 65_535) {
            return Validation.failed(SetupErrorCode.MAIL_CONNECTION_FAILED);
        }
        boolean username = configuration.username() != null && !configuration.username().isBlank();
        boolean password = configuration.password() != null && !configuration.password().isBlank();
        if (username != password) {
            return Validation.failed(SetupErrorCode.MAIL_CONNECTION_FAILED);
        }
        List<SetupWarningCode> warnings = configuration.security() == MailSecurity.NONE
                ? List.of(SetupWarningCode.MAIL_SECURITY_NONE) : List.of();
        return new Validation(true, null, warnings);
    }
}
