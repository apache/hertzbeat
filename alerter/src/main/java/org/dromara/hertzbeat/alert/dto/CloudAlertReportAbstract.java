package org.dromara.hertzbeat.alert.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.Map;

/**
 * 云服务告警信息的抽象父类
 * {@link org.dromara.hertzbeat.common.entity.dto.AlertReport} - 方法与该类参数一一对应，方法含义详情请看该类
 */
public abstract class CloudAlertReportAbstract {

    /**
     * 云告警转为内部告警时的告警名称
     */
    @JsonIgnore
    public abstract String getAlertName() throws Exception;

    /**
     * 云告警转为内部告警时的告警间隔
     */
    @JsonIgnore
    public abstract Integer getAlertDuration() throws Exception;

    /**
     * 云告警转为内部告警时的告警时间
     */
    @JsonIgnore
    public abstract long getAlertTime() throws Exception;

    /**
     * 云告警转为内部告警时的告警严重程度
     */
    @JsonIgnore
    public abstract Integer getPriority() throws Exception;

    /**
     * 云告警转为内部告警时的告警类型
     */
    @JsonIgnore
    public abstract Integer getReportType() throws Exception;

    /**
     * 云告警转为内部告警时的告警标签信息
     */
    @JsonIgnore
    public abstract Map<String, String> getLabels() throws Exception;

    /**
     * 云告警转为内部告警时的告警标注
     */
    @JsonIgnore
    public abstract Map<String, String> getAnnotations() throws Exception;

    /**
     * 云告警转为内部告警时的告警内容
     */
    @JsonIgnore
    public abstract String getContent() throws Exception;

}
