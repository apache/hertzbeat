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

package org.apache.hertzbeat.manager.setup.unattended;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CoderResult;
import java.nio.charset.StandardCharsets;

/** Decodes UTF-8 directly into caller-owned storage so no hidden secret character array is created. */
final class Utf8SecretDecoder {

    private Utf8SecretDecoder() {
    }

    static int decode(byte[] encoded, char[] destination) throws CharacterCodingException {
        ByteBuffer input = ByteBuffer.wrap(encoded);
        CharBuffer output = CharBuffer.wrap(destination);
        java.nio.charset.CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder();
        CoderResult result = decoder.decode(input, output, true);
        if (result.isError()) {
            result.throwException();
        }
        result = decoder.flush(output);
        if (result.isError()) {
            result.throwException();
        }
        return output.position();
    }
}
