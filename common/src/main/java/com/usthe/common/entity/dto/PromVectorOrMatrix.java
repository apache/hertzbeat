package com.usthe.common.entity.dto;

import com.google.gson.JsonObject;
import com.usthe.common.util.GsonUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.Accessors;

import java.util.List;

/**
 * @author myth
 * @create 2022-07-06-18:28
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Accessors(chain = true)
@ToString
public class PromVectorOrMatrix {
    private String status;
    private Data data;

    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Accessors(chain = true)
    @ToString
    public class Data {
        String resultType;
        List<Result> result;
    }

    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Accessors(chain = true)
    @ToString
    public class Result {
        JsonObject metric;
        List<Object> value;
        List<List<Object>> values;
    }

    public static void main(String[] args) {
        String str = "{\"status\":\"success\",\"data\":{\"resultType\":\"matrix\",\"result\":[{\"metric\":{\"__name__\":\"influxdb_queryExecutor_queriesFinished\",\"host\":\"4c01387aba1f\",\"instance\":\"169.254.67.230:9273\",\"job\":\"influxdb_telegraf\",\"url\":\"http://169.254.67.230:8086/debug/vars\"},\"values\":[[1657087767.440,\"230\"],[1657087772.440,\"230\"]]},{\"metric\":{\"__name__\":\"influxdb_queryExecutor_queriesFinished\",\"host\":\"e5f7412d558c\",\"instance\":\"169.254.67.231:9273\",\"job\":\"influxdb_telegraf_02\",\"url\":\"http://169.254.67.231:8086/debug/vars\"},\"values\":[[1657087768.277,\"3\"],[1657087773.277,\"3\"]]}]}}";
        PromVectorOrMatrix promVector = GsonUtil.fromJson(str, PromVectorOrMatrix.class);
        System.out.println(promVector);
    }
}
