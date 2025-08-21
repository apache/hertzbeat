package org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.gson.annotations.SerializedName;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * @Author Duansg
 * @ClassName: TIndexedEntity
 * @Description: TODO
 * @Date 2025/8/20 21:53
 */
@Data
@Builder
public class TimeStreamIndexedEntity {

    /**
     * 文档 _id
     */
    private String id;

    /**
     * labels : {"namespce":"cn-hanzhou","clusterId":"1","nodeId":"node-1","label":"test-cluster","disk_type":"cloud_ssd","cluster_type":"normal"}
     * metrics : {"container_network_receive_bytes_total":10}
     * @timestamp : 1755696479786
     */

    private Map<String, String> labels;

    private Map<String, Object> metrics;

    @SerializedName("@timestamp")
    @JsonProperty("@timestamp")
    private long timestamp;

    /**
     * 操作类型
     */
    private Operator operator;

    private Map<String, Object> actionParams;

    enum Operator {
        INSERT, UPDATE, DELETE
    }

}