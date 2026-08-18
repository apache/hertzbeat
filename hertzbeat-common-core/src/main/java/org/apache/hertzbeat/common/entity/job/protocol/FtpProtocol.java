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
        if (!validateIpDomain(host) || !validPort(port) || StringUtils.isBlank(direction) || StringUtils.isBlank(timeout)) {
            return true;
        }
        if (!CommonUtil.isNumeric(timeout)) {
            return true;
        }
        if (StringUtils.isNotBlank(ssl)
                && !"true".equalsIgnoreCase(ssl)
                && !"false".equalsIgnoreCase(ssl)) {
            return true;
        }
        if (StringUtils.isNotBlank(insecureSkipVerify)
                && !"true".equalsIgnoreCase(insecureSkipVerify)
                && !"false".equalsIgnoreCase(insecureSkipVerify)) {
            return true;
        }
        if (!"true".equalsIgnoreCase(ssl)) {
            return false;
        }
        if (StringUtils.isAnyBlank(username, password)) {
            return true;
        }
        if (StringUtils.isNotBlank(hostKeyFingerprint) && !hasValidHostKeyFingerprints()) {
            return true;
        }
        return !"true".equalsIgnoreCase(insecureSkipVerify) && StringUtils.isBlank(hostKeyFingerprint);
    }

    public boolean hasValidHostKeyFingerprints() {
        List<String> fingerprints = getParsedHostKeyFingerprints();
        return !fingerprints.isEmpty()
                && fingerprints.stream().allMatch(value -> SHA256_FINGERPRINT_PATTERN.matcher(value).matches());
    }

    public List<String> getParsedHostKeyFingerprints() {
        if (StringUtils.isBlank(hostKeyFingerprint)) {
            return List.of();
        }
        return Arrays.stream(hostKeyFingerprint.split("[,;\\r\\n]+"))
                .map(String::trim)
                .filter(StringUtils::isNotEmpty)
                .toList();
    }
}
