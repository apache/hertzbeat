package org.apache.hertzbeat.templatehub.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

@ToString
@AllArgsConstructor
@Getter
public enum CommonError {
    UNKNOWN_ERROR("执行过程异常，请重试"),
    PARAMS_ERROR("非法参数"),
    OBJECT_ERROR("对象为空"),
    QUERY_ERROR("查询结果为空"),
    REQUEST_ERROR("请求参数为空");

    private String errMsg;
}
