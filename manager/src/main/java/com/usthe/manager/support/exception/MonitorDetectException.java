package com.usthe.manager.support.exception;

/**
 * 探测失败异常
 * @author tomsun28
 * @date 2021/11/14 12:19
 */
public class MonitorDetectException extends RuntimeException {

    public MonitorDetectException(String message) {
        super(message);
    }
}
