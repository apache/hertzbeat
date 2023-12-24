package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author dongfeng
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NebulaGraphProtocol {
    /**
     * NebulaGraph 主机ip或域名
     */
    private String host;

    /**
     * NebulaGraph Graph 服务端口默认为 19669
     * NebulaGraph Storage 服务端口默认为 19779
     */
    private String port;

    /**
     * NebulaGraph Graph 服务监控API为/stats
     * NebulaGraph Storage 服务监控API为/rocksdb_stats
     */
    private String url;

    /**
     * NebulaGraph 监控时间间隔
     */
    private String timePeriod;

    /**
     * 超时时间
     */
    private String timeout;

}
