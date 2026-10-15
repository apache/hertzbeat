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

package org.apache.hertzbeat.common.support.valid;

import java.net.URI;
import java.net.URISyntaxException;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.springframework.util.StringUtils;

/**
 * Host Param Validator
 */
public class HostParamValidator implements ConstraintValidator<HostValid, String> {
    public static final String HTTP = "http://";
    public static final String HTTPS = "https://";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (!StringUtils.hasText(value)) {
            return true;
        }
        String candidate = value.trim();
        if (candidate.regionMatches(true, 0, HTTP, 0, HTTP.length())
                || candidate.regionMatches(true, 0, HTTPS, 0, HTTPS.length())) {
            try {
                URI uri = new URI(candidate);
                return uri.getHost() != null && IpDomainUtil.validateIpDomain(uri.getHost());
            } catch (URISyntaxException exception) {
                return false;
            }
        }
        String hostPart = candidate;
        if (candidate.startsWith("[")) {
            int closingBracket = candidate.indexOf(']');
            if (closingBracket < 0 || (closingBracket + 1 < candidate.length()
                    && candidate.charAt(closingBracket + 1) != ':')) {
                return false;
            }
            hostPart = candidate.substring(1, closingBracket);
        } else if (candidate.chars().filter(character -> character == ':').count() == 1) {
            hostPart = candidate.substring(0, candidate.indexOf(':'));
        }
        return IpDomainUtil.validateIpDomain(hostPart);
    }

}
