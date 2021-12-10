package com.usthe.common.util;

/**
 * 公共常量
 *
 *
 */
public interface CommonConstants {

    /**
     * 响应状态码: 成功
     */
    byte SUCCESS_CODE = 0x00;

    /**
     * 响应状态码: 参数校验失败
     */
    byte PARAM_INVALID_CODE = 0x01;

    /**
     * 响应状态码: 探测失败
     */
    byte DETECT_FAILED_CODE = 0x02;

    /**
     * 响应状态码: 监控不存在
     */
    byte MONITOR_NOT_EXIST_CODE = 0x03;

    /**
     * 响应状态码: 监控服务冲突
     */
    byte MONITOR_CONFLICT_CODE = 0x04;

    /**
     * 响应状态码: 登陆账户密码错误
     */
    byte MONITOR_LOGIN_FAILED_CODE = 0x05;

    /**
     * 监控状态码: 未管理
     */
    byte UN_MANAGE_CODE = 0x00;

    /**
     * 监控状态码: 可用
     */
    byte AVAILABLE_CODE = 0x01;

    /**
     * 监控状态码: 不可用
     */
    byte UN_AVAILABLE_CODE = 0x02;

    /**
     * 监控状态码: 不可达
     */
    byte UN_REACHABLE_CODE = 0x03;

    /**
     * 监控状态码: 挂起
     */
    byte SUSPENDING_CODE = 0x04;


    /**
     * 字段参数类型: 数字
     */
    byte TYPE_NUMBER = 0;

    /**
     * 字段参数类型: 字符串
     */
    byte TYPE_STRING = 1;

    /**
     * 字段参数类型: 加密字符串
     */
    byte TYPE_SECRET = 2;

    /**
     * 采集指标值：null空值占位符
     */
    String NULL_VALUE = "&nbsp;";

    /**
     * 可用性对象
     */
    String AVAILABLE = "available";
}
