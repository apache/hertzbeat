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

package org.apache.hertzbeat.templatehub.model.DTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.apache.hertzbeat.templatehub.constants.CommonConstants;

/**
 * Unified message structure definition for front and back ends
 * <p>
 * {
 * data:{....},
 * msg: message,
 * code: 3432
 * }
 */

@Data
@ToString
@Builder
@AllArgsConstructor
public class Message<T> {

    /**
     * response code, not http code
     */
    @Schema(title = "Response Code")
    private byte code = CommonConstants.SUCCESS_CODE;

    /**
     * exception message when error happen or success message
     */
    @Schema(title = "Other Message")
    private String msg;

    /**
     * message body data
     */
    @Schema(description = "Response Data")
    private T data;

    public static <T> Message<T> success() {
        return new Message<>();
    }

    public static <T> Message<T> success(String msg) {
        return new Message<>(msg);
    }

    public static <T> Message<T> fail(byte code, String msg) {
        return new Message<>(code, msg);
    }

    public static <T> Message<T> success(T data) {
        return new Message<>(data);
    }

    public static <T> Message<T> successWithData(T data) {
        return new Message<>(data);
    }

    private Message() {
    }

    private Message(String msg) {
        this.msg = msg;
    }

    private Message(byte code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    private Message(T data) {
        this.data = data;
    }

}
