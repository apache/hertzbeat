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
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.ShortBufferException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.29
 */
public class AesCbc128 extends AbstractIpmiConfidentiality{
    public AesCbc128() throws NoSuchPaddingException, NoSuchAlgorithmException {
        super("AES/CBC/NoPadding");
    }

    @Override
    public void init(int mode, byte[] key, byte[] iv) throws InvalidAlgorithmParameterException, InvalidKeyException {
        if (key.length > 16) {
            key = Arrays.copyOf(key, 16);
        }
        super.init(mode, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
    }

    @Override
    public void encrypt(IpmiSession session, ByteBuffer in, ByteBuffer out) throws InvalidAlgorithmParameterException, InvalidKeyException, ShortBufferException {
        byte[] iv = IpmiConfidentialityAlgorithmWrapper.generateIv();
        byte[] secretKey = session.getK2();
        out.put(iv);
        this.init(Cipher.ENCRYPT_MODE, secretKey, iv);
        int padLength = pad(in.remaining() + 1);
        this.update(in, out);
        if (padLength > 0) {
            ByteBuffer pad = ByteBuffer.allocate(padLength + 1);
            for (int i = 1; i <= padLength; i++) {
                pad.put(ByteConvertUtils.checkCastByte(i));
            }
            pad.put(ByteConvertUtils.checkCastByte(padLength));
            pad.flip();
            this.update(pad, out);
        }
    }

    @Override
    public ByteBuffer decrypt(IpmiSession session, ByteBuffer in) throws InvalidAlgorithmParameterException, InvalidKeyException, ShortBufferException {

        ByteBuffer buffer = ByteBuffer.allocate(in.remaining());
        byte[] iv = ByteOrderUtils.readBytes(in, 16);
        byte[] secretKey = session.getK2();
        this.init(Cipher.DECRYPT_MODE, secretKey, iv);
        this.update(in, buffer);
        int padLength = ByteConvertUtils.byteToInt(buffer.get(buffer.position() - 1));
        for (int i = 1; i <= padLength; i++) {
            if (ByteConvertUtils.byteToInt(buffer.get(buffer.position() - i - 1)) != padLength - i + 1) {
                throw new IllegalArgumentException("Bad pad byte " + i);
            }
        }
        buffer.limit(buffer.position() - padLength - 1);
        buffer.flip();
        return buffer;
    }

    @Override
    public int pad(int length) {
        int t = length % 16;
        if (t == 0) {
            return 0;
        }
        return 16 - t;
    }

    @Override
    public int getEncryptedLength(int length) {
        return 16 + length + pad(length);
    }

    @Override
    public void update(ByteBuffer input, ByteBuffer output) throws ShortBufferException {
        super.update(input, output);
    }
}
