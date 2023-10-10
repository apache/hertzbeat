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
