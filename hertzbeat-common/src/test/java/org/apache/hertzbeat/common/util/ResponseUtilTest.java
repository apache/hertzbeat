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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

import javax.naming.AuthenticationException;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/**
 * Test for {@link ResponseUtil}
 */
public class ResponseUtilTest {
    @Test
    public void testHandle() {
        assertDoesNotThrow(() -> {
            ResponseUtil.handle(() -> "test");
        });

        assertDoesNotThrow(() -> {
            ResponseEntity<Message<String>> resp = ResponseUtil.handle(() -> {
                throw new RuntimeException("test");
            });
            assertEquals(CommonConstants.FAIL_CODE, resp.getBody().getCode());
        });

        assertDoesNotThrow(() -> {
            ResponseEntity<Message<String>> resp = ResponseUtil.handle(() -> {
                throw new AuthenticationException("test");
            });
            assertEquals(CommonConstants.LOGIN_FAILED_CODE, resp.getBody().getCode());
        });

        assertDoesNotThrow(() -> {
            ResponseUtil.Runnable run = new ResponseUtil.Runnable() {
                public void run() {
                    throw new UnsupportedOperationException("Unimplemented method 'run'");
                }
            };
            ResponseEntity<Message<String>> resp = ResponseUtil.handle(run);
            assertEquals(CommonConstants.FAIL_CODE, resp.getBody().getCode());
        });

        assertDoesNotThrow(() -> {
            ResponseUtil.Runnable run = new ResponseUtil.Runnable() {
                public void run() throws AuthenticationException {
                    throw new AuthenticationException("test");
                }
            };
            ResponseEntity<Message<String>> resp = ResponseUtil.handle(run);
            assertEquals(CommonConstants.LOGIN_FAILED_CODE, resp.getBody().getCode());
        });

        assertDoesNotThrow(() -> {
            ResponseEntity<Message<String>> resp = ResponseUtil.handle(() -> {});
            assertEquals(CommonConstants.SUCCESS_CODE, resp.getBody().getCode());
        });
    }

    /**
     * InnerResponseUtilTest
     */
    public interface InnerResponseUtilTest {
        void run() throws Exception;
    }
}
