package com.usthe.collector.dispatch.timer;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.usthe.collector.dispatch.MetricsTaskDispatch;
import com.usthe.collector.util.SpringContextHolder;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.util.AesUtil;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * TimerTask实现
 * @author tomsun28
 * @date 2021/11/1 17:18
 */
@Slf4j
public class WheelTimerTask implements TimerTask {

    private final Job job;
    private final MetricsTaskDispatch metricsTaskDispatch;
    private static final Gson GSON = new Gson();

    public WheelTimerTask(Job job) {
        this.metricsTaskDispatch = SpringContextHolder.getBean(MetricsTaskDispatch.class);
        this.job = job;
        // 初始化job 将监控实际参数值对采集字段进行替换
        initJobMetrics(job);
    }

    /**
     * 初始化job填充信息
     * @param job job
     */
    private void initJobMetrics(Job job) {
        // 将监控实际参数值对采集字段进行替换
        List<Configmap> config = job.getConfigmap();
        Map<String, Configmap> configmap = config.stream()
                .peek(item -> {
                    // 对加密串进行解密
                    if (item.getType() == CommonConstants.PARAM_TYPE_PASSWORD && item.getValue() != null) {
                        String decodeValue = AesUtil.aesDecode(String.valueOf(item.getValue()));
                        if (decodeValue == null) {
                            log.error("Aes Decode value {} error.", item.getValue());
                        }
                        item.setValue(decodeValue);
                    } else if (item.getValue() != null && item.getValue() instanceof String) {
                        item.setValue(((String) item.getValue()).trim());
                    }
                })
                .collect(Collectors.toMap(Configmap::getKey, item -> item));
        List<Metrics> metrics = job.getMetrics();
        List<Metrics> metricsTmp = new ArrayList<>(metrics.size());
        for (Metrics metric : metrics) {
            JsonElement jsonElement = GSON.toJsonTree(metric);
            jsonElement = replaceSpecialValue(jsonElement, configmap);
            metric = GSON.fromJson(jsonElement, Metrics.class);
            metricsTmp.add(metric);
        }
        job.setMetrics(metricsTmp);
    }

    /**
     * json参数替换
     * @param jsonElement json
     * @param configmap 参数map
     * @return json
     */
    private JsonElement replaceSpecialValue(JsonElement jsonElement, Map<String, Configmap> configmap) {
        if (jsonElement.isJsonObject()) {
            JsonObject jsonObject = jsonElement.getAsJsonObject();
            Iterator<Map.Entry<String, JsonElement>> iterator = jsonObject.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, JsonElement> entry = iterator.next();
                JsonElement element = entry.getValue();
                if (element.isJsonPrimitive()) {
                    // 判断是否含有特殊字符 替换
                    String value = element.getAsString();
                    if (value.startsWith("^_^") && value.endsWith("^_^")) {
                        value = value.replaceAll("\\^_\\^", "");
                        Configmap param = configmap.get(value);
                        if (param != null) {
                            value = (String) param.getValue();
                            jsonObject.addProperty(entry.getKey(), value);
                        } else {
                            iterator.remove();
                        }
                    }
                } else {
                    jsonObject.add(entry.getKey(), replaceSpecialValue(entry.getValue(), configmap));
                }
            }
        } else if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            Iterator<JsonElement> iterator = jsonArray.iterator();
            int index = 0;
            while (iterator.hasNext()) {
                JsonElement element = iterator.next();
                if (element.isJsonPrimitive()) {
                    // 判断是否含有特殊字符 替换
                    String value = element.getAsString();
                    if (value.startsWith("^_^") && value.endsWith("^_^")) {
                        value = value.replaceAll("\\^_\\^", "");
                        Configmap param = configmap.get(value);
                        if (param != null) {
                            value = (String) param.getValue();
                            jsonArray.set(index, new JsonPrimitive(value));
                        } else {
                            iterator.remove();
                        }
                    }
                } else {
                    jsonArray.set(index, replaceSpecialValue(element, configmap));
                }
                index++;
            }
        }
        return jsonElement;
    }


    @Override
    public void run(Timeout timeout) throws Exception {
        job.setDispatchTime(System.currentTimeMillis());
        metricsTaskDispatch.dispatchMetricsTask(timeout);
    }

    public Job getJob() {
        return job;
    }
}
