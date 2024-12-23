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

package org.apache.hertzbeat.common.entity.arrow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CollectCodeConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.reader.DefaultMetadataReader;
import org.apache.hertzbeat.common.entity.arrow.writer.ArrowVectorWriter;

/**
 * Metrics Data Builder
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class MetricsDataBuilder extends DefaultMetadataReader {
    private Long monitorId;
    private Long tenantId;
    private String app;
    private String metrics;
    private Byte priority;
    private Long time;
    private String code;
    private String msg;
    private ArrowVectorWriter arrowVectorWriter;

    public MetricsDataBuilder(ArrowVectorWriter arrowVectorWriter) {
        this.arrowVectorWriter = arrowVectorWriter;
        this.metadata = arrowVectorWriter.getSchemaMetadata();
    }

    public ArrowVector build() {
        buildMetadata();

        return arrowVectorWriter.doWrite();
    }

    public boolean isFailed() {
        return !isSuccess();
    }

    public boolean isSuccess() {
        return metadata.containsKey(CollectCodeConstants.SUCCESS);
    }

    public void setFailedMsg(String msg) {
        setCodeAndMsg(CollectCodeConstants.FAILED, msg);
    }

    public void setCodeAndMsg(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    private void buildMetadata() {
        safePutMetadata(MetricDataConstants.MONITOR_ID, String.valueOf(monitorId));
        safePutMetadata(MetricDataConstants.TENANT_ID, String.valueOf(tenantId));
        safePutMetadata(MetricDataConstants.APP, app);
        safePutMetadata(MetricDataConstants.METRICS, metrics);
        safePutMetadata(MetricDataConstants.PRIORITY, String.valueOf(priority));
        safePutMetadata(MetricDataConstants.TIME, String.valueOf(time));
        safePutMetadata(MetricDataConstants.CODE, code);
        safePutMetadata(MetricDataConstants.MSG, msg);
    }

    private void safePutMetadata(String key, String value) {
        if (StringUtils.isNoneBlank(key, value)) {
            metadata.put(key, value);
        }
    }
}
