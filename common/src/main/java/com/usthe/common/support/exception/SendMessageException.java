package com.usthe.common.support.exception;

/**
 * send message exception
 * @author tom
 * @date 2022/5/8 17:59
 */
public class SendMessageException extends RuntimeException {
    public SendMessageException(String message) {
        super(message);
    }
}
