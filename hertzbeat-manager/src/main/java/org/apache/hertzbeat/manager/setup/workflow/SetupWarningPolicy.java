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
import org.apache.hertzbeat.manager.setup.config.SetupPublicAddress;

/** Single warning policy shared by live setup and restart status projection. */
public final class SetupWarningPolicy {
    public static final SetupWarningPolicy INSTANCE = new SetupWarningPolicy();

    private SetupWarningPolicy() {
    }

    public List<SetupWarningCode> evaluate(MetadataDatabaseKind kind, OptionsRequest options) {
        String publicBaseUrl = options.publicAccess() == null ? null : options.publicAccess().publicBaseUrl();
        String otlpHttpEndpoint = options.publicAccess() == null ? null
                : options.publicAccess().serverOtlpHttpEndpoint();
        String otlpGrpcEndpoint = options.publicAccess() == null ? null
                : options.publicAccess().serverOtlpGrpcEndpoint();
        MailSecurity mailSecurity = options.mail() == null ? null : options.mail().security();
        return evaluate(kind, publicBaseUrl, otlpHttpEndpoint, otlpGrpcEndpoint, mailSecurity);
    }

    public List<SetupWarningCode> evaluate(
            MetadataDatabaseKind kind, String publicBaseUrl, String otlpHttpEndpoint,
            String otlpGrpcEndpoint, MailSecurity mailSecurity) {
        List<SetupWarningCode> warnings = new ArrayList<>();
        if (kind == MetadataDatabaseKind.H2) {
            warnings.add(SetupWarningCode.H2_NON_PRODUCTION);
        }
        if (SetupPublicAddress.tryPublicBaseUrl(publicBaseUrl).filter(SetupPublicAddress::plaintextPublic).isPresent()
                || SetupPublicAddress.tryServerOtlpEndpoint(otlpHttpEndpoint)
                .filter(SetupPublicAddress::plaintextPublic).isPresent()
                || SetupPublicAddress.tryServerOtlpEndpoint(otlpGrpcEndpoint)
                .filter(SetupPublicAddress::plaintextPublic).isPresent()) {
            warnings.add(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT);
        }
        if (mailSecurity == MailSecurity.NONE) {
            warnings.add(SetupWarningCode.MAIL_SECURITY_NONE);
        }
        return List.copyOf(warnings);
    }
}
