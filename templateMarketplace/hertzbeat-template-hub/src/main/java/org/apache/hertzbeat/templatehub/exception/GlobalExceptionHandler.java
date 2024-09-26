package org.apache.hertzbeat.templatehub.exception;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.ArrayList;
import java.util.List;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {
    @ResponseBody
    @ExceptionHandler(HertzbeatTemplateHubException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Message<Object>> customException(HertzbeatTemplateHubException e) {

        //记录异常
        log.error("系统异常:{}", e.getMessage(), e);
        //..

        //解析出异常信息
        String errMessage = e.getMessage();
//        RestErrorResponse restErrorResponse = new RestErrorResponse(errMessage);
//        return restErrorResponse;

        return ResponseEntity.ok(Message.fail(FAIL_CODE,errMessage));
    }

    @ResponseBody
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Message<Object>> exception(Exception e) {

        //记录异常
        log.error("系统异常:{}", e.getMessage(), e);
        if (e.getMessage().equals("不允许访问")) {
//            return new RestErrorResponse("您没有权限操作此功能");
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"您没有权限操作此功能"));
        }

        //解析出异常信息
//        RestErrorResponse restErrorResponse = new RestErrorResponse(CommonError.UNKNOWN_ERROR.getErrMsg());
//        return restErrorResponse;
        return ResponseEntity.ok(Message.fail(FAIL_CODE,CommonError.UNKNOWN_ERROR.getErrMsg()));
    }
}
