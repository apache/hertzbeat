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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 * Abstract ipmi session payload
 */
public abstract class AbstractSessionIpmiPayload extends AbstractIpmiPayload {

    /**
     *  See IPMIv2 Section 13.20
     */
    public enum MaximumPrivilegeLevel implements IpmiCode.Code {
        UNSPECIFIED(0),
        CALLBACK(1),
        USER(2),
        OPERATOR(3),
        ADMINISTRATOR(4),
        OEM(5);

        private byte code;

        public static final int MASK = 0xF;

        MaximumPrivilegeLevel(int code){
            this.code = ByteConvertUtils.checkCastByte(code);
        }

        @Override
        public byte getCode() {
            return code;
        }
    }

    public byte messageTag;

    public byte getMessageTag() {
        return messageTag;
    }

    public void setMessageTag(byte messageTag) {
        this.messageTag = messageTag;
    }

}
