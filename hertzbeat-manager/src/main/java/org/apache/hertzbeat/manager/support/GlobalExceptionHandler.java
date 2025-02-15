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

package org.apache.hertzbeat.manager.support;

import static org.apache.hertzbeat.common.constants.CommonConstants.DETECT_FAILED_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_CONFLICT_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.PARAM_INVALID_CODE;
import java.util.Objects;
import javax.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.manager.support.exception.MonitorDatabaseException;
import org.apache.hertzbeat.manager.support.exception.MonitorDetectException;
import org.apache.hertzbeat.manager.support.exception.MonitorMetricsException;
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
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * controller exception handler
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String CONNECT_STR = "||";

    /**
     * Processing probe failure
     * @param exception Detection anomaly
     * @return response
     */
    @ExceptionHandler(MonitorDetectException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorDetectException(MonitorDetectException exception) {
        Message<Void> message = Message.fail(DETECT_FAILED_CODE, exception.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }

    /**
     * processing database operation exception
     * @param exception Detection anomaly
     * @return response
     */
    @ExceptionHandler(MonitorDatabaseException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorDatabaseException(MonitorDatabaseException exception) {
        Message<Void> message = Message.fail(MONITOR_CONFLICT_CODE, exception.getMessage());
        return ResponseEntity.ok(message);
    }

    /**
     * handle common exception
     * @param exception common
     * @return response
     */
    @ExceptionHandler(CommonException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleCommonException(CommonException exception) {
        Message<Void> message = Message.fail(FAIL_CODE, exception.getMessage());
        return ResponseEntity.ok(message);
    }
    
    /**
     * processing parameter error
     * @param exception parameter exception
     * @return response
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleIllegalArgumentException(IllegalArgumentException exception) {
        Message<Void> message = Message.fail(PARAM_INVALID_CODE, exception.getMessage());
        return ResponseEntity.ok(message);
    }

    @ExceptionHandler(AlertNoticeException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleAlertNoticeException(AlertNoticeException noticeException) {
        Message<Void> message = Message.fail(FAIL_CODE, noticeException.getMessage());
        return ResponseEntity.ok(message);
    }

    /**
     * processing parameter error, parameter mapping body error
     * @param exception Parameter mapping body is abnormal
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
            Message<Void> message = Message.fail(PARAM_INVALID_CODE, msg);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
        } catch (Exception e) {
            Message<Void> message = Message.fail(PARAM_INVALID_CODE, exception.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
        }
    }

    /**
     * handler the exception thrown for data input verify
     * @param e data input verify exception
     * @return response
     */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    @ResponseBody
    ResponseEntity<Message<Void>> handleInputValidException(Exception e) {
        StringBuffer errorMessage = new StringBuffer();
        if (e instanceof MethodArgumentNotValidException exception) {
            exception.getBindingResult().getAllErrors().forEach(error -> {
                try {
                    String field = Objects.requireNonNull(error.getCodes())[0];
                    errorMessage.append(field).append(":").append(error.getDefaultMessage()).append(CONNECT_STR);
                } catch (Exception e1) {
                    errorMessage.append(error.getDefaultMessage()).append(CONNECT_STR);
                }
            });
        } else if (e instanceof BindException exception) {
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
        Message<Void> message = Message.fail(PARAM_INVALID_CODE, errorMsg);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }

    /**
     * handler the exception thrown for data input verify
     * @param e data input verify exception
     * @return response
     */
    @ExceptionHandler({ConstraintViolationException.class})
    @ResponseBody
    ResponseEntity<Message<Void>> handleInputOtherValidException(ConstraintViolationException e) {
        StringBuffer errorMessage = new StringBuffer();
        e.getConstraintViolations().forEach(error -> {
            try {
                String field = error.getPropertyPath().toString();
                errorMessage.append(field).append(":").append(error.getMessage()).append(CONNECT_STR);
            } catch (Exception e1) {
                errorMessage.append(error.getMessage()).append(CONNECT_STR);
            }
        });
        String errorMsg = errorMessage.toString();
        if (errorMsg.endsWith(CONNECT_STR)) {
            errorMsg = errorMsg.substring(0, errorMsg.length() - 2);
        }
        log.warn("[input argument not valid happen]-{}", errorMsg);
        Message<Void> message = Message.fail(PARAM_INVALID_CODE, errorMsg);
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
        Message<Void> message = Message.fail(MONITOR_CONFLICT_CODE, errorMessage);
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
        Message<Void> message = Message.success(errorMessage);
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(message);
    }

    /**
     * processing monitor metrics exception
     * @param exception MonitorMetricsException
     * @return response
     */
    @ExceptionHandler(MonitorMetricsException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorMetricsException(MonitorMetricsException exception) {
        Message<Void> message = Message.fail(PARAM_INVALID_CODE, exception.getMessage());
        return ResponseEntity.ok(message);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    void ignoreNoResourceFoundException(Exception ex) throws Exception {
        throw ex;
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
        Message<Void> message = Message.fail(MONITOR_CONFLICT_CODE, errorMessage);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }
}
