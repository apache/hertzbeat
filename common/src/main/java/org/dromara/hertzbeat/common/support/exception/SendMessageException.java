package org.dromara.hertzbeat.common.support.exception;

/**
 * send message exception
 * @author tom
 */
public class SendMessageException extends RuntimeException {
    public SendMessageException(String message) {
        super(message);
    }
}
