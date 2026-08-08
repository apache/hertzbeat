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

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.ManagedOptionalConfiguration.ServerInstrumentationSettings;

/** Single warning policy shared by live setup and restart status projection. */
public final class SetupWarningPolicy {
    public static final SetupWarningPolicy INSTANCE = new SetupWarningPolicy();

    private SetupWarningPolicy() {
    }

    public List<SetupWarningCode> evaluate(MetadataDatabaseKind kind, OptionsRequest options) {
        String otlpHttpEndpoint = options.serverInstrumentation() == null ? null
                : options.serverInstrumentation().serverOtlpHttpEndpoint();
        String otlpGrpcEndpoint = options.serverInstrumentation() == null ? null
                : options.serverInstrumentation().serverOtlpGrpcEndpoint();
        MailSecurity mailSecurity = options.mail() == null ? null : options.mail().security();
        return evaluate(kind, otlpHttpEndpoint, otlpGrpcEndpoint, mailSecurity);
    }

    public List<SetupWarningCode> evaluate(
            MetadataDatabaseKind kind, String otlpHttpEndpoint, String otlpGrpcEndpoint,
            MailSecurity mailSecurity) {
        List<SetupWarningCode> warnings = new ArrayList<>();
        if (kind == MetadataDatabaseKind.H2) {
            warnings.add(SetupWarningCode.H2_NON_PRODUCTION);
        }
        if (plaintext(otlpHttpEndpoint) || plaintext(otlpGrpcEndpoint)) {
            warnings.add(SetupWarningCode.SERVER_OTLP_PLAINTEXT);
        }
        if (mailSecurity == MailSecurity.NONE) {
            warnings.add(SetupWarningCode.MAIL_SECURITY_NONE);
        }
        return List.copyOf(warnings);
    }

    private static boolean plaintext(String endpoint) {
        return ServerInstrumentationSettings.normalize(endpoint)
                .filter(value -> value.regionMatches(true, 0, "http://", 0, 7))
                .isPresent();
    }
}
