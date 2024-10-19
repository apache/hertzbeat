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

package org.apache.hertzbeat.templatehub.exception;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {
    @ResponseBody
    @ExceptionHandler(HertzbeatTemplateHubException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Message<Object>> customException(HertzbeatTemplateHubException e) {
        log.error("系统异常:{}", e.getMessage(), e);

        String errMessage = e.getMessage();

        return ResponseEntity.ok(Message.fail(FAIL_CODE,errMessage));
    }

    @ResponseBody
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Message<Object>> exception(Exception e) {

        log.error("系统异常:{}", e.getMessage(), e);
        if (e.getMessage().equals("不允许访问")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"您没有权限操作此功能"));
        }

        return ResponseEntity.ok(Message.fail(FAIL_CODE,CommonError.UNKNOWN_ERROR.getErrMsg()));
    }
}
