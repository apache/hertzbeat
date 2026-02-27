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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality;

import java.nio.ByteBuffer;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;

/**
 *  See IPMIv2 Section 13.28.5
 */
public class None implements IpmiConfidentiality {

    @Override
    public int getBlockSize() {
        return 1;
    }

    @Override
    public void init(int mode, byte[] key, byte[] iv) throws InvalidAlgorithmParameterException, InvalidKeyException {
    }

    @Override
    public void encrypt(IpmiSession session, ByteBuffer in, ByteBuffer out) {
        out.put(in);
    }

    @Override
    public ByteBuffer decrypt(IpmiSession session, ByteBuffer in) {
        return in;
    }

    @Override
    public int pad(int length) {
        return 0;
    }

    @Override
    public int getEncryptedLength(int length) {
        return length;
    }
}
