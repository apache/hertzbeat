package com.usthe.manager.support.exception;

/**
 * 数据库操作异常
 * @author tomsun28
 * @date 2021/11/15 13:25
 */
public class MonitorDatabaseException extends RuntimeException {
    public MonitorDatabaseException(String message) {
        super(message);
    }
}
