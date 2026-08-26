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

package org.apache.hertzbeat.common.entity.job.protocol;

import static org.apache.hertzbeat.common.util.IpDomainUtil.validPort;
import static org.apache.hertzbeat.common.util.IpDomainUtil.validateIpDomain;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * ftp protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FtpProtocol implements CommonRequestProtocol, Protocol {

    private static final Pattern SHA256_FINGERPRINT_PATTERN =
            Pattern.compile("SHA256:[A-Za-z0-9+/]{43}=?");
    private static final String UNRESOLVED_SSL_PLACEHOLDER = "^_^ssl^_^";
    /**
     * Peer host ip or domain name
     */
    private String host;

    /**
     * port number
     */
    private String port;

    /**
     * Redis Username (optional)
     */
    private String username;

    /**
     * Redis password(optional)
     */
    private String password;

    /**
     * file catalog
     */
    private String direction;

    /**
     * Timeout
     */
    private String timeout;

    /**
     * Whether ftp uses link encryption ssl/tls, i.e. ftp or sftp
     *
     */
    private String ssl = "false";

    /**
     * Expected SFTP server host key fingerprints, separated by commas or line
     * breaks, for example SHA256:base64.
     */
    private String hostKeyFingerprint;

    /**
     * Whether SFTP host key verification is explicitly disabled.
     */
    private String insecureSkipVerify;

    @Override
    public boolean isInvalid() {
        return validationError() != null;
    }

    /**
     * Validate the complete FTP/SFTP protocol contract used by collectors.
     *
     * @return a safe operator-facing error, or {@code null} when valid
     */
    public String validationError() {
        if (!validateIpDomain(host)) {
            return "Ftp Protocol host is invalid.";
        }
        if (!validPort(port)) {
            return "Ftp Protocol port is invalid.";
        }
        if (StringUtils.isBlank(direction)) {
            return "Ftp Protocol direction is required.";
        }
        if (StringUtils.isBlank(timeout) || !CommonUtil.isNumeric(timeout)) {
            return "Ftp Protocol timeout must be numeric.";
        }
        if (UNRESOLVED_SSL_PLACEHOLDER.equals(ssl)) {
            return null;
        }
        if (StringUtils.isNotBlank(ssl)
                && !"true".equalsIgnoreCase(ssl)
                && !"false".equalsIgnoreCase(ssl)) {
            return "Ftp Protocol SFTP option must be true or false.";
        }
        if (!"true".equalsIgnoreCase(ssl)) {
            return null;
        }
        if (StringUtils.isNotBlank(insecureSkipVerify)
                && !"true".equalsIgnoreCase(insecureSkipVerify)
                && !"false".equalsIgnoreCase(insecureSkipVerify)) {
            return "Sftp Protocol skip-verification option must be true or false.";
        }
        if (StringUtils.isAnyBlank(username, password)) {
            return "Sftp Protocol username and password are required.";
        }
        if ("true".equalsIgnoreCase(insecureSkipVerify)) {
            return null;
        }
        if (StringUtils.isBlank(hostKeyFingerprint)) {
            return "Sftp Protocol host key fingerprint is required unless verification is explicitly skipped.";
        }
        if (!hasValidHostKeyFingerprints()) {
            return "Sftp Protocol host key fingerprints must use the SHA256:base64 format.";
        }
        return null;
    }

    public boolean hasValidHostKeyFingerprints() {
        List<String> fingerprints = parseHostKeyFingerprints();
        return !fingerprints.isEmpty()
                && fingerprints.stream().allMatch(value -> SHA256_FINGERPRINT_PATTERN.matcher(value).matches());
    }

    public List<String> parseHostKeyFingerprints() {
        if (StringUtils.isBlank(hostKeyFingerprint)) {
            return List.of();
        }
        return Arrays.stream(hostKeyFingerprint.split("[,;\\r\\n]+"))
                .map(String::trim)
                .filter(StringUtils::isNotEmpty)
                .toList();
    }
}
