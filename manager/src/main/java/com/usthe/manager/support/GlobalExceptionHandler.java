package com.usthe.manager.support;


import com.usthe.common.entity.dto.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * controller exception handler
 *
 *
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * handler the exception thrown for data input verify
     * @param exception data input verify exception
     * @return response
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseBody
    ResponseEntity<Message> handleInputValidException(MethodArgumentNotValidException exception) {
        StringBuffer errorMessage = new StringBuffer();
        if (exception != null) {
            exception.getBindingResult().getAllErrors().forEach(error ->
                    errorMessage.append(error.getDefaultMessage()).append("."));
        }
        if (log.isDebugEnabled()) {
            log.debug("[sample-tom]-[input argument not valid happen]-{}", errorMessage, exception);
        }
        Message message = Message.builder().msg(errorMessage.toString()).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message);
    }

    /**
     * handler the exception thrown for datastore error
     * @param exception datastore exception
     * @return response
     */
    @ExceptionHandler(DataAccessException.class)
    @ResponseBody
    ResponseEntity<Message> handleDataAccessException(DataAccessException exception) {
        String errorMessage = "database error happen";
        if (exception != null) {
            errorMessage = exception.getMessage();
        }
        log.warn("[sample-tom]-[database error happen]-{}", errorMessage, exception);
        Message message = Message.builder().msg(errorMessage).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }

    /**
     * handle Request method not supported
     * @param exception Request method not supported
     * @return response
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseBody
    ResponseEntity<Message> handleMethodNotSupportException(HttpRequestMethodNotSupportedException exception) {
        String errorMessage = "Request method not supported";
        if (exception != null && exception.getMessage() != null) {
            errorMessage = exception.getMessage();
        }
        log.info("[monitor]-[Request method not supported]-{}", errorMessage);
        Message message = Message.builder().msg(errorMessage).build();
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(message);
    }

    /**
     * handler the exception thrown for unCatch and unKnown
     * @param exception UnknownException
     * @return response
     */
    @ExceptionHandler(Exception.class)
    @ResponseBody
    ResponseEntity<Message> handleUnknownException(Exception exception) {
        String errorMessage = "unknown error happen";
        if (exception != null) {
            errorMessage = exception.getMessage();
        }
        log.error("[monitor]-[unknown error happen]-{}", errorMessage, exception);
        Message message = Message.builder().msg(errorMessage).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(message);
    }

}
