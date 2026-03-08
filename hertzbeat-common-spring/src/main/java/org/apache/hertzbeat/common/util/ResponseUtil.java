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

import javax.naming.AuthenticationException;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.ResponseEntity;

/**
 * A tool which make the restful response be easy to use
 */
public class ResponseUtil {
    public static <T, E extends Exception> ResponseEntity<Message<T>> handle(Supplier<T, E> supplier) {
        try {
            T result = supplier.get();
            return ResponseEntity.ok(Message.success(result));
        } catch (Exception e) {
            byte err = CommonConstants.FAIL_CODE;
            if (e.getClass().equals(AuthenticationException.class)) {
                err = CommonConstants.LOGIN_FAILED_CODE;
            }
            return ResponseEntity.ok(Message.fail(err, e.getMessage()));
        }
    }

    public static <T, E extends Exception> ResponseEntity<Message<T>> handle(Runnable runner) {
        try {
            runner.run();
            return ResponseEntity.ok(Message.success());
        } catch (Exception e) {
            byte err = CommonConstants.FAIL_CODE;
            if (e.getClass().equals(AuthenticationException.class)) {
                err = CommonConstants.LOGIN_FAILED_CODE;
            }
            return ResponseEntity.ok(Message.fail(err, e.getMessage()));
        }
    }

    /**
     * Supplier interface for getting result
     */
    public interface Supplier<T, E extends Exception> {

        /**
         * Gets a result.
         *
         * @return a result
         */
        T get() throws E;
    }
    
    /**
     * Runnable interface for running
     */
    public interface Runnable {

        /**
         * Run target method.
         */
        void run() throws Exception;
    }
}
