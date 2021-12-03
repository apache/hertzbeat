package com.usthe.common.util;

/**
 * 公共常量
 * @author tomsun28
 * @date 2021/11/14 12:06
 */
public interface CommonConstants {

    /**
     * 响应状态码: 成功
     */
    byte SUCCESS = 0x00;

    /**
     * 响应状态码: 参数校验失败
     */
    byte PARAM_INVALID = 0x01;

    /**
     * 响应状态码: 探测失败
     */
    byte DETECT_FAILED = 0x02;

    /**
     * 响应状态码: 监控不存在
     */
    byte MONITOR_NOT_EXIST = 0x03;

    /**
     * 响应状态码: 监控服务冲突
     */
    byte MONITOR_CONFLICT = 0x04;

    /**
     * 响应状态码: 登陆账户密码错误
     */
    byte MONITOR_LOGIN_FAILED = 0x05;

    /**
     * 监控状态码: 未管理
     */
    byte UN_MANAGE = 0x00;

    /**
     * 监控状态码: 可用
     */
    byte AVAILABLE = 0x01;

    /**
     * 监控状态码: 不可用
     */
    byte UN_AVAILABLE = 0x02;

    /**
     * 监控状态码: 不可达
     */
    byte UN_REACHABLE = 0x03;

    /**
     * 监控状态码: 挂起
     */
    byte SUSPENDING = 0x04;


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
}
