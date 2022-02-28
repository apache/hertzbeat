package com.usthe.common.util;

/**
 * 公共常量
 * @author tomsun28
 * @date 2021/11/14 12:06
 */
public interface CommonConstants {

    /**
     * 响应状态码: 通用成功
     */
    byte SUCCESS_CODE = 0x00;

    /**
     * 响应状态码: 通用失败
     */
    byte FAIL_CODE = 0x0F;

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
     * 响应状态码: 登录账户密码错误
     */
    byte MONITOR_LOGIN_FAILED_CODE = 0x05;

    /**
     * 响应状态码: 注册失败异常
     */
    byte MONITOR_REGISTER_FAILED_CODE = 0x06;



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
     * 告警状态: 0-正常告警(待处理)
     */
    byte ALERT_STATUS_CODE_PENDING = 0x00;

    /**
     * 告警状态: 1-阈值触发但未达到告警次数
     */
    byte ALERT_STATUS_CODE_NOT_REACH = 0x01;

    /**
     * 告警状态: 2-恢复告警
     */
    byte ALERT_STATUS_CODE_RESTORED = 0x02;

    /**
     * 告警状态: 3-已处理
     */
    byte ALERT_STATUS_CODE_SOLVED = 0x03;

    /**
     * 告警级别: 0:高-emergency-紧急告警-红色
     */
    byte ALERT_PRIORITY_CODE_EMERGENCY = 0x00;

    /**
     * 告警级别: 1:中-critical-严重告警-橙色
     */
    byte ALERT_PRIORITY_CODE_CRITICAL = 0x01;

    /**
     * 告警级别: 2:低-warning-警告告警-黄色
     */
    byte ALERT_PRIORITY_CODE_WARNING = 0x02;

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

    /**
     * 可达性对象
     */
    String REACHABLE = "reachable";

    /**
     * 参数类型 数字
     */
    byte PARAM_TYPE_NUMBER = 0;

    /**
     * 参数类型 字符串
     */
    byte PARAM_TYPE_STRING = 1;

    /**
     * 参数类型 密码
     */
    byte PARAM_TYPE_PASSWORD = 2;

    /**
     * 认证类型 账户密码
     */
    byte AUTH_TYPE_PASSWORD = 1;

    /**
     * 认证类型 GITHUB三方登录
     */
    byte AUTH_TYPE_GITHUB = 2;

    /**
     * 认证类型 微信三方登录
     */
    byte AUTH_TYPE_WEIXIN = 3;

    /**
     * 认证类型 GITEE三方登录
     */
    byte AUTH_TYPE_GITEE = 5;
}
