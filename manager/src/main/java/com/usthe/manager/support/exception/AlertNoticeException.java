package com.usthe.manager.support.exception;

/**
 * alert notice send failed
 * 告警通知发送异常
 * @author tom
 * @date 2022/5/8 17:59
 */
public class AlertNoticeException extends RuntimeException {
    public AlertNoticeException(String message) {
        super(message);
    }
}
