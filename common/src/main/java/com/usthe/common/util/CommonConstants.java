/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.usthe.common.util;

/**
 * Public Constant
 * 公共常量
 *
 * @author tomsun28
 * @date 2021/11/14 12:06
 */
public interface CommonConstants {

    /**
     * Response status code: generic success
     * 响应状态码: 通用成功
     */
    byte SUCCESS_CODE = 0x00;

    /**
     * Response status code: generic failure
     * 响应状态码: 通用失败
     */
    byte FAIL_CODE = 0x0F;

    /**
     * Response status code: Parameter verification failed
     * 响应状态码: 参数校验失败
     */
    byte PARAM_INVALID_CODE = 0x01;

    /**
     * Response Status Code: Probe Failed
     * 响应状态码: 探测失败
     */
    byte DETECT_FAILED_CODE = 0x02;

    /**
     * Response status code: monitoring does not exist
     * 响应状态码: 监控不存在
     */
    byte MONITOR_NOT_EXIST_CODE = 0x03;

    /**
     * Response Status Code: Monitor Service Conflict
     * 响应状态码: 监控服务冲突
     */
    byte MONITOR_CONFLICT_CODE = 0x04;

    /**
     * Response status code: Incorrect login account password
     * 响应状态码: 登录账户密码错误
     */
    byte MONITOR_LOGIN_FAILED_CODE = 0x05;

    /**
     * Response status code: Registration failed exception
     * 响应状态码: 注册失败异常
     */
    byte MONITOR_REGISTER_FAILED_CODE = 0x06;


    /**
     * Monitoring Status Code: Unmanaged
     * 监控状态码: 未管理
     */
    byte UN_MANAGE_CODE = 0x00;

    /**
     * Monitoring Status Code: Available
     * 监控状态码: 可用
     */
    byte AVAILABLE_CODE = 0x01;

    /**
     * Monitoring Status Code: Not Available
     * 监控状态码: 不可用
     */
    byte UN_AVAILABLE_CODE = 0x02;

    /**
     * Monitoring Status Code: Unreachable
     * 监控状态码: 不可达
     */
    byte UN_REACHABLE_CODE = 0x03;

    /**
     * Monitoring Status Code: Pending
     * 监控状态码: 挂起
     */
    byte SUSPENDING_CODE = 0x04;

    /**
     * Alarm status: 0 - normal alarm (to be processed)
     * 告警状态: 0-正常告警(待处理)
     */
    byte ALERT_STATUS_CODE_PENDING = 0x00;

    /**
     * Alarm Status: 1 - Threshold triggered but not reached the number of alarms
     * 告警状态: 1-阈值触发但未达到告警次数
     */
    byte ALERT_STATUS_CODE_NOT_REACH = 0x01;

    /**
     * Alarm Status: 2-Restore Alarm
     * 告警状态: 2-恢复告警
     */
    byte ALERT_STATUS_CODE_RESTORED = 0x02;

    /**
     * Alert Status: 3-Handled
     * 告警状态: 3-已处理
     */
    byte ALERT_STATUS_CODE_SOLVED = 0x03;

    /**
     * Alarm level: 0: high-emergency-emergency-red
     * 告警级别: 0:高-emergency-紧急告警-红色
     */
    byte ALERT_PRIORITY_CODE_EMERGENCY = 0x00;

    /**
     * Alarm severity: 1: medium-critical-critical alarm-orange
     * 告警级别: 1:中-critical-严重告警-橙色
     */
    byte ALERT_PRIORITY_CODE_CRITICAL = 0x01;

    /**
     * Warning level: 2: low-warning-warning warning-yellow
     * 告警级别: 2:低-warning-警告告警-黄色
     */
    byte ALERT_PRIORITY_CODE_WARNING = 0x02;

    /**
     * Field parameter type: number
     * 字段参数类型: 数字
     */
    byte TYPE_NUMBER = 0;

    /**
     * Field parameter type: String
     * 字段参数类型: 字符串
     */
    byte TYPE_STRING = 1;

    /**
     * Field parameter type: encrypted string
     * 字段参数类型: 加密字符串
     */
    byte TYPE_SECRET = 2;

    /**
     * Collection indicator value: null placeholder for empty value
     * 采集指标值：null空值占位符
     */
    String NULL_VALUE = "&nbsp;";

    /**
     *
     *
     */
    String PROM_TIME = "timestamp";

    /**
     *
     *
     */
    String PROM_VALUE = "value";


    /**
     * Availability Object
     * 可用性对象
     */
    String AVAILABLE = "available";

    /**
     * Reachability Object可达性对象
     */
    String REACHABLE = "reachable";

    /**
     * Parameter Type Number
     * 参数类型 数字
     */
    byte PARAM_TYPE_NUMBER = 0;

    /**
     * Parameter Type String
     * 参数类型 字符串
     */
    byte PARAM_TYPE_STRING = 1;

    /**
     * Parameter Type Password
     * 参数类型 密码
     */
    byte PARAM_TYPE_PASSWORD = 2;

    /**
     * Authentication type Account password
     * 认证类型 账户密码
     */
    byte AUTH_TYPE_PASSWORD = 1;

    /**
     * Authentication type GITHUB three-party login
     * 认证类型 GITHUB三方登录
     */
    byte AUTH_TYPE_GITHUB = 2;

    /**
     * Authentication type WeChat three-party login
     * 认证类型 微信三方登录
     */
    byte AUTH_TYPE_WEIXIN = 3;

    /**
     * Authentication type GITEE three-party login
     * 认证类型 GITEE三方登录
     */
    byte AUTH_TYPE_GITEE = 5;

    /**
     * 内有标签: monitorId 监控ID
     */
    String TAG_MONITOR_ID = "monitorId";

    /**
     * 内有标签: monitorName 监控名称
     */
    String TAG_MONITOR_NAME = "monitorName";

    /**
     * 内有标签: app 监控类型
     */
    String TAG_MONITOR_APP = "app";
}
