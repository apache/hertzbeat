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

package com.usthe.manager.support;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.support.exception.AlertNoticeException;
import com.usthe.manager.support.exception.MonitorDatabaseException;
import com.usthe.manager.support.exception.MonitorDetectException;
import com.usthe.manager.support.exception.MonitorMetricsException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Objects;

import static com.usthe.common.util.CommonConstants.*;

/**
 * controller exception handler
 * @author tomsun28
 * @date 22:45 2019-08-01
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String CONNECT_STR = "||";

    /**
     * 处理探测失败
     * @param exception 探测异常
     * @return response
     */
    @ExceptionHandler(MonitorDetectException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorDetectException(MonitorDetectException exception) {
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(DETECT_FAILED_CODE).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }

    /**
     * 处理数据库操作异常
     * @param exception 探测异常
     * @return response
     */
    @ExceptionHandler(MonitorDatabaseException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorDatabaseException(MonitorDatabaseException exception) {
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(MONITOR_CONFLICT_CODE).build();
        return ResponseEntity.ok(message);
    }

    /**
     * 处理参数错误的失败
     * @param exception 参数异常
     * @return response
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleIllegalArgumentException(IllegalArgumentException exception) {
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(PARAM_INVALID_CODE).build();
        return ResponseEntity.ok(message);
    }

    @ExceptionHandler(AlertNoticeException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleAlertNoticeException(AlertNoticeException noticeException) {
        Message<Void> message = Message.<Void>builder().msg(noticeException.getMessage()).code(FAIL_CODE).build();
        return ResponseEntity.ok(message);
    }

    /**
     * 处理请求参数错误的失败, 请求参数json映射body时出错
     * @param exception 参数映射body异常
     * @return response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleHttpMessageNotReadableException(HttpMessageNotReadableException exception) {
        try {
            String msg = exception.getCause().getMessage();
            if (msg == null) {
                msg = exception.getMessage();
            }
            Message<Void> message = Message.<Void>builder().msg(msg).code(PARAM_INVALID_CODE).build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
        } catch (Exception e) {
            Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(PARAM_INVALID_CODE).build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
        }
    }


    /**
     * handler the exception thrown for data input verify
     * valid注解校验框架校验异常统一处理
     * @param e data input verify exception
     * @return response
     */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    @ResponseBody
    ResponseEntity<Message<Void>> handleInputValidException(Exception e) {
        StringBuffer errorMessage = new StringBuffer();
        if (e instanceof MethodArgumentNotValidException) {
            MethodArgumentNotValidException exception = (MethodArgumentNotValidException)e;
            exception.getBindingResult().getAllErrors().forEach(error -> {
                try {
                    String field = Objects.requireNonNull(error.getCodes())[0];
                    errorMessage.append(field).append(":").append(error.getDefaultMessage()).append(CONNECT_STR);
                } catch (Exception e1) {
                    errorMessage.append(error.getDefaultMessage()).append(CONNECT_STR);
                }
            });
        } else if (e instanceof BindException) {
            BindException exception = (BindException)e;
            exception.getAllErrors().forEach(error ->
                    errorMessage.append(error.getDefaultMessage()).append(CONNECT_STR));
        }
        String errorMsg = errorMessage.toString();
        if (errorMsg.endsWith(CONNECT_STR)) {
            errorMsg = errorMsg.substring(0, errorMsg.length() - 2);
        }
        if (log.isDebugEnabled()) {
            log.debug("[input argument not valid happen]-{}", errorMsg, e);
        }
        Message<Void> message = Message.<Void>builder().msg(errorMsg).code(PARAM_INVALID_CODE).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }


    /**
     * handler the exception thrown for datastore error
     * @param exception datastore exception
     * @return response
     */
    @ExceptionHandler(DataAccessException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleDataAccessException(DataAccessException exception) {
        String errorMessage = "database error happen";
        if (exception != null) {
            errorMessage = exception.getMessage();
        }
        log.warn("[database error happen]-{}", errorMessage, exception);
        Message<Void> message = Message.<Void>builder().msg(errorMessage).code(MONITOR_CONFLICT_CODE).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }

    /**
     * handle Request method not supported
     * @param exception Request method not supported
     * @return response
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMethodNotSupportException(HttpRequestMethodNotSupportedException exception) {
        String errorMessage = "Request method not supported";
        if (exception != null && exception.getMessage() != null) {
            errorMessage = exception.getMessage();
        }
        log.info("[monitor]-[Request method not supported]-{}", errorMessage);
        Message<Void> message = Message.<Void>builder().msg(errorMessage).build();
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(message);
    }

    /**
     * handler the exception thrown for unCatch and unKnown
     * @param exception UnknownException
     * @return response
     */
    @ExceptionHandler(Exception.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleUnknownException(Exception exception) {
        String errorMessage = "unknown error happen";
        if (exception != null) {
            errorMessage = exception.getMessage();
        }
        log.error("[monitor]-[unknown error happen]-{}", errorMessage, exception);
        Message<Void> message = Message.<Void>builder().msg(errorMessage).code(MONITOR_CONFLICT_CODE).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }

    /**
     * 处理监控指标传参异常
     * @param exception 指标参数异常
     * @return
     */
    @ExceptionHandler(MonitorMetricsException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorMetricsException(MonitorMetricsException exception) {
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(PARAM_INVALID_CODE).build();
        return ResponseEntity.ok(message);
    }


}
