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

package org.apache.hertzbeat.common.constants;

/**
 * Public Common Constant
 */
public interface CommonConstants {

    /**
     * Response status code: generic success
     */
    byte SUCCESS_CODE = 0x00;

    /**
     * Response status code: generic failure
     */
    byte FAIL_CODE = 0x0F;

    /**
     * Response status code: Parameter verification failed
     */
    byte PARAM_INVALID_CODE = 0x01;

    /**
     * Response Status Code: Probe Failed
     */
    byte DETECT_FAILED_CODE = 0x02;

    /**
     * Response status code: monitoring does not exist
     */
    byte MONITOR_NOT_EXIST_CODE = 0x03;

    /**
     * Response Status Code: Monitor Service Conflict
     */
    byte MONITOR_CONFLICT_CODE = 0x04;

    /**
     * Response status code: Incorrect login account password
     */
    byte LOGIN_FAILED_CODE = 0x05;
    
    /**
     * Monitoring status 0: Paused, 1: Up, 2: Down
     */
    byte MONITOR_PAUSED_CODE = 0x00;

    /**
     * Monitoring status 0: Paused, 1: Up, 2: Down
     */
    byte MONITOR_UP_CODE = 0x01;

    /**
     * Monitoring status 0: Paused, 1: Up, 2: Down
     */
    byte MONITOR_DOWN_CODE = 0x02;

    /**
     * Monitor bind type, 0: monitor that auto-created by sd
     */
    byte MONITOR_BIND_TYPE_SD_SUB_MONITOR = 0x00;

    /**
     * Monitor bind type, 1: the main monitor of sd
     */
    byte MONITOR_BIND_TYPE_SD_MAIN_MONITOR = 0x01;

    /**
     * label key: instance
     */
    String LABEL_INSTANCE = "instance";

    /**
     * label key: alert name
     */
    String LABEL_ALERT_NAME = "alertname";

    /**
     * label key: host
     */
    String LABEL_HOST = "host";
    
    /**
     * Alarm severity label key
     */
    String LABEL_ALERT_SEVERITY = "severity";

    /**
     * Alarm severity fatal level
     */
    String LABEL_ALERT_FATAL = "fatal";
    
    /**
     * alarm severity emergency level
     */
    String ALERT_SEVERITY_EMERGENCY = "emergency";

    /**
     * alarm severity critical level
     */
    String ALERT_SEVERITY_CRITICAL = "critical";

    /**
     * alarm severity warning level
     */
    String ALERT_SEVERITY_WARNING = "warning";

    /**
     * alarm severity info level
     */
    String ALERT_SEVERITY_INFO = "info";

    /**
     * Alarm status: firing
     */
    String ALERT_STATUS_FIRING = "firing";

    /**
     * Alarm status: resolved
     */
    String ALERT_STATUS_RESOLVED = "resolved";

    /**
     * Alarm status: pending
     */
    String ALERT_STATUS_PENDING = "pending";

    /**
     * alert threshold type: realtime
     */
    String ALERT_THRESHOLD_TYPE_REALTIME = "realtime";

    /**
     * alert threshold type: periodic
     */
    String ALERT_THRESHOLD_TYPE_PERIODIC = "periodic";

    /**
     * Field parameter type: number
     */
    byte TYPE_NUMBER = 0;

    /**
     * Field parameter type: String
     */
    byte TYPE_STRING = 1;

    /**
     * Field parameter type: encrypted string
     */
    byte TYPE_SECRET = 2;

    /**
     * Field parameter type: time
     */
    byte TYPE_TIME = 3;

    /**
     * Collection metric value: null placeholder for empty value
     */
    String NULL_VALUE = "&nbsp;";

    /**
     *
     */
    String PROM_TIME = "timestamp";

    /**
     *
     */
    String PROM_VALUE = "value";

    /**
     * Monitor total availability metrics
     */
    String AVAILABILITY = "availability";

    /**
     * Parameter Type Number
     */
    byte PARAM_TYPE_NUMBER = 0;

    /**
     * Parameter Type String
     */
    byte PARAM_TYPE_STRING = 1;

    /**
     * Parameter Type Password
     */
    byte PARAM_TYPE_PASSWORD = 2;

    /**
     * Parameter Type Map values
     */
    byte PARAM_TYPE_MAP = 3;

    /**
     * Parameter Type arrays values
     */
    byte PARAM_TYPE_ARRAY = 4;

    /**
     * Authentication type Account password
     */
    byte AUTH_TYPE_PASSWORD = 1;

    /**
     * Authentication type GitHub three-party login
     */
    byte AUTH_TYPE_GITHUB = 2;

    /**
     * Authentication type WeChat three-party login
     */
    byte AUTH_TYPE_WEIXIN = 3;

    /**
     * Authentication type GITEE three-party login
     */
    byte AUTH_TYPE_GITEE = 5;

    /**
     * inner default label key __instance__
     */
    String LABEL_INNER_KEY_INSTANCE = "__instance__";
    
    /**
     * Inside the tag: monitorId Monitor task ID
     */
    String TAG_MONITOR_ID = "monitorId";

    /**
     * Inside the tag: monitorName Task name
     */
    String TAG_MONITOR_NAME = "monitorName";

    /**
     * Inside the tag: indicate that this monitor is auto-created by main monitor
     */
    String TAG_AUTO_CREATED = "autoCreated";

    /**
     * Inside the tag: indicate that this monitor is a main monitor which provides service discovery
     */
    String TAG_SD_MAIN_MONITOR = "sdMainMonitor";

    /**
     * Inside the tag: monitorHost Task host
     */
    String TAG_MONITOR_HOST = "monitorHost";

    /**
     * Inside the tag: policyId Alarm threshold rule ID
     */
    String TAG_THRESHOLD_ID = "thresholdId";

    /**
     * Inside the tag: app Type of monitoring
     */
    String TAG_MONITOR_APP = "app";

    /**
     * Inside the tag: metrics
     */
    String TAG_METRICS = "metrics";

    /**
     * Inside the tag: metric
     */
    String TAG_METRIC = "metric";

    /**
     * Inside the tag: code
     */
    String TAG_CODE = "code";

    /**
     * Tag Type: Auto-generated
     */
    byte TAG_TYPE_AUTO_GENERATE = 0;
    /**
     * Tag Type: User-generated
     */
    byte TAG_TYPE_USER_GENERATE = 1;
    /**
     * Tag Type: System preset
     */
    byte TAG_TYPE_SYSTEM_PRESET = 2;

    /**
     * notice_period type Type field, daily type
     */
    int NOTICE_PERIOD_DAILY = 0;

    /**
     * key is receiver.id, value is noticePeriod cache key prefix
     */
    String RECEIVER_NOTICE_PERIOD_CACHE_PREFIX = "receiver_notice_period:";

    /**
     * cache key notice_rule
     */
    String CACHE_NOTICE_RULE = "notice_rule";

    /**
     * cache key alert silence
     */
    String CACHE_ALERT_SILENCE = "alert_silence";

    /**
     * cache key alert define
     */
    String CACHE_ALERT_DEFINE = "alert_define";

    /**
     * cache key alert converge
     */
    String CACHE_ALERT_GROUP_CONVERGE = "alert_group_converge";

    /**
     * cache key alert inhibit
     */
    String CACHE_ALERT_INHIBIT = "alert_inhibit";

    /**
     * collector status online 0
     */
    byte COLLECTOR_STATUS_ONLINE = 0;

    /**
     * collector status offline 1
     */
    byte COLLECTOR_STATUS_OFFLINE = 1;

    /**
     * default main collector name
     */
    String MAIN_COLLECTOR_NODE = "main-default-collector";

    /**
     * locale spilt
     */
    String LOCALE_SEPARATOR = "_";

    /**
     * ignore label
     * Handle situations where recovery alarms are not configured, but need to be used to change task state
     */
    String IGNORE = "ignore";

    /**
     * collector mode public
     */
    String MODE_PUBLIC = "public";

    /**
     * collector mode private
     */
    String MODE_PRIVATE = "private";

    /**
     * collector auth failed message
     */
    String COLLECTOR_AUTH_FAILED = "Auth Failed";

    /**
     * for prometheus task name prefix
     */
    String PROMETHEUS_APP_PREFIX = "_prometheus_";

    /**
     * prometheus 
     */
    String PROMETHEUS = "prometheus";

    /**
     * status page component state normal
     */
    byte STATUS_PAGE_COMPONENT_STATE_NORMAL = 0;
    
    /**
     * status page component state abnormal
     */
    byte STATUS_PAGE_COMPONENT_STATE_ABNORMAL = 1;
    
    /**
     * status page component state unknown
     */
    byte STATUS_PAGE_COMPONENT_STATE_UNKNOWN = 2;

    /**
     * status page org state all normal
     */
    byte STATUS_PAGE_ORG_STATE_ALL_NORMAL = 0;

    /**
     * status page org state some abnormal
     */
    byte STATUS_PAGE_ORG_STATE_SOME_ABNORMAL = 1;

    /**
     * status page org state all abnormal
     */
    byte STATUS_PAGE_ORG_STATE_ALL_ABNORMAL = 2;
    
    /**
     * status page component calculate method auto
     */
    byte STATUE_PAGE_CALCULATE_METHOD_AUTO = 0;
    
    /**
     * status page component calculate method manual
     */
    byte STATUS_PAGE_CALCULATE_METHOD_MANUAL = 1;

    /**
     * status page incident state investigating
     */
    byte STATUS_PAGE_INCIDENT_STATE_INVESTIGATING = 0;
    
    /**
     * status page incident state identified
     */
    byte STATUS_PAGE_INCIDENT_STATE_IDENTIFIED = 1;
    
    /**
     * status page incident state monitoring
     */
    byte STATUS_PAGE_INCIDENT_STATE_MONITORING = 2;
    
    /**
     * status page incident state resolved
     */
    byte STATUS_PAGE_INCIDENT_STATE_RESOLVED = 3;
}
