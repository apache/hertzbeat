package com.usthe.warehouse.controller;

import com.usthe.common.entity.dto.Field;
import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.dto.MetricsData;
import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.dto.ValueRow;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.warehouse.store.RedisDataStorage;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 指标数据查询接口
 *
 *
 */
@RestController
@RequestMapping(produces = {APPLICATION_JSON_VALUE})
@Api(tags = "监控指标数据API")
public class MetricsDataController {

    @Autowired
    private RedisDataStorage redisDataStorage;

    @GetMapping("/monitor/{monitorId}/metrics/{metrics}")
    @ApiOperation(value = "查询监控指标组的指标数据", notes = "查询监控指标组的指标数据")
    public ResponseEntity<Message<MetricsData>> getMetricsData(
            @ApiParam(value = "监控ID", example = "343254354")
            @PathVariable Long monitorId,
            @ApiParam(value = "监控指标组", example = "cpu")
            @PathVariable String metrics) {
        CollectRep.MetricsData redisData = redisDataStorage.getCurrentMetricsData(monitorId, metrics);
        if (redisData == null) {
            return ResponseEntity.ok().body(new Message<>("query metrics data is empty"));
        }
        {
            MetricsData.MetricsDataBuilder dataBuilder = MetricsData.builder();
            dataBuilder.id(redisData.getId()).app(redisData.getApp()).metric(redisData.getMetrics())
                    .time(redisData.getTime());
            List<Field> fields = redisData.getFieldsList().stream().map(redisField ->
                            Field.builder().name(redisField.getName())
                                    .type(Integer.valueOf(redisField.getType()).byteValue())
                                    .build())
                    .collect(Collectors.toList());
            dataBuilder.fields(fields);
            List<ValueRow> valueRows = redisData.getValuesList().stream().map(redisValueRow ->
                    ValueRow.builder().instance(redisValueRow.getInstance())
                            .values(redisValueRow.getColumnsList().stream().map(Value::new).collect(Collectors.toList()))
                    .build()).collect(Collectors.toList());
            dataBuilder.valueRows(valueRows);
            return ResponseEntity.ok().body(new Message<>(dataBuilder.build()));
        }
    }

    @GetMapping("/monitor/{monitorId}/metric/{metricFull}")
    @ApiOperation(value = "查询监控指标组的指定指标的历史数据", notes = "查询监控指标组下的指定指标的历史数据")
    public ResponseEntity<Message<Void>> getMetricHistoryData(
            @ApiParam(value = "监控ID", example = "343254354")
            @PathVariable Long monitorId,
            @ApiParam(value = "监控指标全路径", example = "linux.cpu.usage")
            @PathVariable() String metricFull,
            @ApiParam(value = "查询历史时间段,默认6h-6小时:h-小时, d-天, m-月, y-年", example = "6h")
            @RequestParam(required = false) String history
            ) {
        String[] names = metricFull.split(".");
        if (names.length != 3) {
            throw new IllegalArgumentException("metrics full name: " + metricFull + " is illegal.");
        }
        String app = names[0];
        String metrics = names[1];
        String metric = names[2];
        return ResponseEntity.ok().body(null);
    }
}
