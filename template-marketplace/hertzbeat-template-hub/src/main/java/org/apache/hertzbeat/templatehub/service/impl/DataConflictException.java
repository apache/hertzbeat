package org.apache.hertzbeat.templatehub.service.impl;


/**
 * data conflict exception
 * @author tomsun28
 * @date 22:55 2020-04-27
 */
public class DataConflictException extends RuntimeException {

    public DataConflictException(String msg) {
        super(msg);
    }
}
