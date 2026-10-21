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

package org.apache.hertzbeat.observability.logs.sse;

/**
 * UTF-8 replacement grouping used by the pinned Greptime 1.1.4 OTLP byte projection.
 * Follows Rust's UTF-8 valid-prefix/error-length rules, including surrogate rejection.
 * @see <a href="https://doc.rust-lang.org/std/string/struct.String.html#method.from_utf8_lossy">Rust lossy decoding</a>
 */
final class LogUtf8Lossy {
    private LogUtf8Lossy() { }

    static String decode(byte[] bytes) {
        var result = new StringBuilder(bytes.length);
        int index = 0;
        while (index < bytes.length) {
            int first = bytes[index] & 255;
            if (first < 128) {
                result.append((char) first);
                index++;
                continue;
            }
            int width = first >= 194 && first <= 223 ? 2 : first >= 224 && first <= 239 ? 3 : first >= 240 && first <= 244 ? 4 : 0;
            int consumed = 1;
            int codePoint = first & (width == 2 ? 31 : width == 3 ? 15 : 7);
            while (consumed < width && index + consumed < bytes.length) {
                int next = bytes[index + consumed] & 255;
                if (next < 128 || next > 191 || (consumed == 1 && ((first == 224 && next < 160)
                        || (first == 237 && next > 159) || (first == 240 && next < 144) || (first == 244 && next > 143)))) {
                    break;
                }
                codePoint = (codePoint << 6) | (next & 63);
                consumed++;
            }
            if (width > 0 && consumed == width) {
                result.appendCodePoint(codePoint);
            } else {
                result.append('\ufffd');
            }
            index += consumed;
        }
        return result.toString();
    }
}
