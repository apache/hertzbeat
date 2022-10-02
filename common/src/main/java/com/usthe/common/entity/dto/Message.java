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

package com.usthe.common.entity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import static com.usthe.common.util.CommonConstants.SUCCESS_CODE;

/**
 * Unified message structure definition for front and back ends
 *
 * {
 *   data:{....},
 *   msg: message,
 *   code: 3432
 * }
 * @author tomsun28
 * @date 23:48 2019/08/01
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "公共消息包装")
public class Message<T> {

    /**
     * message body data
     */
    @Schema(description = "响应数据")
    private T data;

    /**
     * exception message when error happen or success message
     */
    @Schema(title = "携带消息")
    private String msg;

    /**
     * response code, not http code
     */
    @Schema(title = "携带编码")
    private byte code = SUCCESS_CODE;

    public Message(String msg) {
        this.msg = msg;
    }

    public Message(byte code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public Message(T data) {
        this.data = data;
    }
}
