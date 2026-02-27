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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.IpmiAuthentication;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.None;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.RakpHmacMd5;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.RakpHmacSha1;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.RakpHmacSha256;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 13.28
 */
public enum IpmiAuthenticationCode implements IpmiCode.Code{
    RAKP_NOME(0x00, None.class),
    RAKP_HMAC_SHA1(0x01, RakpHmacSha1.class),
    RAKP_HMAC_MD5(0x02, RakpHmacMd5.class),
    RAKP_HMAC_SHA256(0x03, RakpHmacSha256.class);

    private final byte code;

    private final Class<? extends IpmiAuthentication> authentication;


    IpmiAuthenticationCode(int code, Class<? extends IpmiAuthentication> authentication) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.authentication = authentication;
    }

    @Override
    public byte getCode() {
        return code;
    }

    public IpmiAuthentication newIpmiAuthentication() {
        if (authentication == null) {
            return null;
        }
        try {
            return authentication.newInstance();
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }
}
