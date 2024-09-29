package org.apache.hertzbeat.templatehub.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.ToString;

import java.io.Serializable;

@Data
@ToString
@AllArgsConstructor
public class RestErrorResponse implements Serializable {

    private String errMsg;
}
