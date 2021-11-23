package com.usthe.manager.support;


import com.usthe.common.entity.dto.Message;
import com.usthe.manager.support.exception.MonitorDatabaseException;
import com.usthe.manager.support.exception.MonitorDetectException;
import com.usthe.scheduler.ScheduleException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import javax.validation.ConstraintViolationException;
import javax.validation.ValidationException;
import java.lang.reflect.Field;

import static com.usthe.common.util.CommonConstants.DETECT_FAILED;
import static com.usthe.common.util.CommonConstants.MONITOR_CONFLICT;
import static com.usthe.common.util.CommonConstants.PARAM_INVALID;

/**
 * controller exception handler
 * @author tomsun28
 * @date 22:45 2019-08-01
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static Field detailMessage;

    private static Field fieldErrorField;

    static {
        try {
            detailMessage = Throwable.class.getDeclaredField("detailMessage");
            detailMessage.setAccessible(true);
            fieldErrorField = FieldError.class.getDeclaredField("field");
            fieldErrorField.setAccessible(true);
        } catch (Exception e) {}
    }

    /**
     * 处理探测失败
     * @param exception 探测异常
     * @return response
     */
    @ExceptionHandler(MonitorDetectException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleMonitorDetectException(MonitorDetectException exception) {
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(DETECT_FAILED).build();
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
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(MONITOR_CONFLICT).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }

    /**
     * 处理参数错误的失败
     * @param exception 参数异常
     * @return response
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleIllegalArgumentException(IllegalArgumentException exception) {
        Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(PARAM_INVALID).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
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
            Message<Void> message = Message.<Void>builder().msg((String) detailMessage.get(exception)).code(PARAM_INVALID).build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
        } catch (Exception e) {
            Message<Void> message = Message.<Void>builder().msg(exception.getMessage()).code(PARAM_INVALID).build();
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
                    String field = (String) fieldErrorField.get(error);
                    errorMessage.append(field).append(":").append(error.getDefaultMessage()).append("||");
                } catch (Exception e1) {
                    errorMessage.append(error.getDefaultMessage()).append("||");
                }
            });
        } else if (e instanceof BindException) {
            BindException exception = (BindException)e;
            exception.getAllErrors().forEach(error -> {
                errorMessage.append(error.getDefaultMessage()).append("||");
            });
        }
        if (log.isDebugEnabled()) {
            log.debug("[input argument not valid happen]-{}", errorMessage, e);
        }
        Message<Void> message = Message.<Void>builder().msg(errorMessage.toString()).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }

    /**
     * 处理分发调度器异常问题
     * @param exception 调度器异常问题
     * @return response
     */
    @ExceptionHandler(ScheduleException.class)
    @ResponseBody
    ResponseEntity<Message<Void>> handleScheduleException(ScheduleException exception) {
        String errorMessage = "scheduler warning";
        if (exception != null) {
            errorMessage = exception.getMessage();
        }
        log.warn("[scheduler warning]-{}", errorMessage);
        Message<Void> message = Message.<Void>builder().msg(errorMessage).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
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
        Message<Void> message = Message.<Void>builder().msg(errorMessage).build();
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
        Message<Void> message = Message.<Void>builder().msg(errorMessage).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }

}
