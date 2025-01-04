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

package org.apache.hertzbeat.common.util;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.SdMonitorParam;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;

/**
 * Operator for service discovery
 */
public class SdMonitorOperator {
    public static Optional<Param> getSdParam(List<Param> params) {
        return params.stream()
                .filter(param -> StringUtils.isNoneBlank(param.getField(), param.getParamValue()))
                .filter(param -> Objects.nonNull(ServiceDiscoveryProtocol.Type.getType(param.getField())))
                .findFirst();
    }

    public static List<Param> removeSdParam(List<Param> params) {
        return params.stream()
                .filter(param -> Objects.isNull(ServiceDiscoveryProtocol.Type.getType(param.getField())))
                .collect(Collectors.toList());
    }

    public static List<Param> cloneParamList(List<Param> params) {
        return params.stream()
                .map(Param::clone)
                .peek(param -> param.setId(null))
                .collect(Collectors.toList());
    }

    public static MonitorBind buildSdSubMonitorBind(SdMonitorParam sdMonitorParam, long monitorId, Map<String, String> labels) {
        if (Objects.isNull(sdMonitorParam.getBizId())) {
            return null;
        }
        labels.put(CommonConstants.TAG_AUTO_CREATED, String.valueOf(sdMonitorParam.getBizId()));
        return MonitorBind.builder()
                .id(SnowFlakeIdGenerator.generateId())
                .bizId(sdMonitorParam.getBizId())
                .monitorId(monitorId)
                .type(CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR)
                .build();
    }

    public static MonitorBind buildSdMainMonitorBind(SdMonitorParam sdMonitorParam, long monitorId) {
        if (Objects.isNull(sdMonitorParam.getSdParam())) {
            return null;
        }

        return MonitorBind.builder()
                .id(SnowFlakeIdGenerator.generateId())
                .bizId(sdMonitorParam.getBizId())
                .monitorId(monitorId)
                .type(CommonConstants.MONITOR_BIND_TYPE_SD_MAIN_MONITOR)
                .build();
    }

    public static Job constructSdJobAndTag(SdMonitorParam sdMonitorParam, Map<String, String> labels, Job appDefine) {
        if (Objects.isNull(sdMonitorParam.getSdParam())) {
            return appDefine;
        }
        labels.put(CommonConstants.TAG_SD_MAIN_MONITOR, ServiceDiscoveryProtocol.Type.getType(sdMonitorParam.getSdParam().getField()).name());
        return constructSdJob(appDefine, sdMonitorParam.getSdParam());
    }

    public static Job constructSdJob(Job appDefine, Param sdParam) {
        final Job sdJob = appDefine.clone();
        final ServiceDiscoveryProtocol.Type sdType = ServiceDiscoveryProtocol.Type.getType(sdParam.getField());
        List<Metrics> metricsList = Lists.newArrayList();
        Map<String, String> i18n = Maps.newHashMap();
        i18n.put("zh-CN", "监控目标");
        i18n.put("en-US", "Monitor Target");
        List<Metrics.Field> fields = Lists.newArrayList();
        fields.add(Metrics.Field.builder()
                .field("host")
                .type(CommonConstants.TYPE_STRING)
                .i18n(constructSdFieldI18n("主机", "host"))
                .build());
        fields.add(Metrics.Field.builder()
                .field("port")
                .type(CommonConstants.TYPE_STRING)
                .i18n(constructSdFieldI18n("端口", "port"))
                .build());
        metricsList.add(Metrics.builder()
                .name("target")
                .fields(fields)
                .i18n(i18n)
                .protocol(sdType.getProtocolName())
                .sdProtocol(ServiceDiscoveryProtocol.builder()
                        .sdSource(sdParam.getParamValue())
                        .type(sdType)
                        .build())
                .build());

        sdJob.setSd(Boolean.TRUE);
        sdJob.setMetrics(metricsList);
        sdJob.setConfigmap(Lists.newArrayList(new Configmap(sdParam.getField(), sdParam.getParamValue(), sdParam.getType())));
        return sdJob;
    }

    public static List<Tag> addMainMonitorTag(List<Tag> tagList, Param sdParam) {
        tagList = tagList.stream()
                .filter(tag -> !StringUtils.equals(tag.getName(), CommonConstants.TAG_SD_MAIN_MONITOR))
                .filter(tag -> !StringUtils.equals(tag.getName(), CommonConstants.TAG_AUTO_CREATED))
                .collect(Collectors.toList());

        tagList.add(Tag.builder().name(CommonConstants.TAG_SD_MAIN_MONITOR)
                .tagValue(ServiceDiscoveryProtocol.Type.getType(sdParam.getField()).name())
                .type(CommonConstants.TAG_TYPE_AUTO_GENERATE)
                .build());

        return tagList;
    }

    private static Map<String, String> constructSdFieldI18n(String zh, String en) {
        Map<String, String> i18n = Maps.newHashMap();
        i18n.put("zh-CN", zh);
        i18n.put("en-US", en);
        return i18n;
    }
}
