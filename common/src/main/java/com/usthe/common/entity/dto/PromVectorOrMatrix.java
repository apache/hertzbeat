package com.usthe.common.entity.dto;

import com.google.gson.JsonObject;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.Accessors;

import java.util.List;

/**
 * @author myth
 * @date 2022-07-06-18:28
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
}
