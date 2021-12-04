package com.usthe.common.entity.job;

import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.job.protocol.IcmpProtocol;
import com.usthe.common.entity.job.protocol.JdbcProtocol;
import com.usthe.common.entity.job.protocol.TcpUdpProtocol;
import com.usthe.common.entity.job.protocol.TelnetProtocol;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Objects;

/**
 * 监控采集的指标集合详情 eg: cpu | memory | health
 * @author tomsun28
 * @date 2021/10/17 21:24
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Metrics {

    /**
     * 公共属性-名称 eg: cpu | memory | health
     */
    private String name;
    /**
     * 公共属性-采集监控协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
     */
    private String protocol;
    /**
     * 范围(0-127)指标组调度优先级,数值越小优先级越高
     * 优先级高的调度采集完成后才会调度下一优先级的指标组采集任务
     * 可用性指标组(availability)默认优先级为0,其它普通指标组范围为1-127,即需要等availability采集成功后才会调度后面的指标组任务
     */
    private Byte priority;
    /**
     * 公共属性-采集监控的最终结果属性集合 eg: speed | times | size
     */
    private List<Field> fields;
    /**
     * 公共属性-采集监控的前置查询属性集合 eg: size1 | size2 | speedSize
     */
    private List<String> aliasFields;
    /**
     * 公共属性-表达式计算，将前置查询属性(preFields)与最终属性(fields)映射,计算出最终属性(fields)值
     * eg: size = size1 + size2, speed = speedSize
     * https://www.yuque.com/boyan-avfmj/aviatorscript/ban32m
     */
    private List<String> calculates;

    /**
     * 使用http协议的监控配置信息
     */
    private HttpProtocol http;
    /**
     * 使用icmp协议进行ping的监控配置信息
     */
    private IcmpProtocol icmp;
    /**
     * 使用telnet协议的监控配置信息
     */
    private TelnetProtocol telnet;
    /**
     * 使用socket实现的tcp或ucp进行服务端口探测配置信息
     */
    private TcpUdpProtocol tcpUdp;
    /**
     * 使用公共的jdbc规范实现的数据库配置信息
     */
    private JdbcProtocol jdbc;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Metrics metrics = (Metrics) o;
        return name.equals(metrics.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Field {
        /**
         * 指标名称
         */
        private String field;
        /**
         * 指标类型 0-number:数字 1-string:字符串
         */
        private byte type = 1;
        /**
         * 此字段是否为实例主键
         */
        private boolean instance = false;
        /**
         * 指标单位
         */
        private String unit;
    }
}
