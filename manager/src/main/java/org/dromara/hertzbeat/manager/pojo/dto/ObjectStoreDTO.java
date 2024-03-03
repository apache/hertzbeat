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

package org.dromara.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 文件存储容器
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/9/13
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectStoreDTO<T> {

    /**
     * 文件存储服务类型
     */
    private Type type;

    /**
     * 配置项
     */
    private T config;

    /**
     * 文件存储服务类型
     */
    public enum Type {

        /**
         * 本地文件
         */
        FILE,

        /**
         * <a href="https://support.huaweicloud.com/obs/index.html">华为云OBS</a>
         */
        OBS
    }

    /**
     * 文件存储配置
     */
    @Data
    public static class ObsConfig {
        private String accessKey;
        private String secretKey;
        private String bucketName;
        private String endpoint;

        /**
         * 保存路径
         */
        private String savePath = "hertzbeat";
    }

}
