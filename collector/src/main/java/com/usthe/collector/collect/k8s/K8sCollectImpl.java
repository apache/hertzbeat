package com.usthe.collector.collect.k8s;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.util.K8sClient;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.K8sProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.entity.message.CollectRep.MetricsData.Builder;
import io.kubernetes.client.openapi.models.V1NamespaceList;
import io.kubernetes.client.openapi.models.V1NodeList;
import io.kubernetes.client.openapi.models.V1PodList;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;

import javax.annotation.Nullable;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;


/**
 * k8s客户端查询的采集实现 - 1
 * @author myth
 * @date 2022/10/08 9:31
 */
@Slf4j
public class K8sCollectImpl extends AbstractCollect {
    //todo 这部分代码 cv来的 配置文件不支持自定义没实现的指标，不够灵活，比如k8s service类型缺失，还是考虑用http api方式

    public static K8sCollectImpl getInstance() {
        return K8sCollectImpl.Singleton.INSTANCE;
    }

    private K8sCollectImpl(){}

    @Override
    public void collect(Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        //1. 获取k8s协议配置信息，初始化k8s客户端
        K8sClient k8sClient = initK8sClient(builder, metrics);
        if(null==k8sClient){
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("kubernetes collect create k8sClient failed!");
            return;
        }
        //2. 根据配置信息携带的type，选择不同的k8s客户端方法获取数据
        if(null==metrics.getK8s() || StringUtils.EMPTY.equals(metrics.getK8s().getType())){
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("kubernetes collect must has k8s params:type!");
            return;
        }
        K8sMetricsModel k8sMetricsModel = getK8sMetricsByType(k8sClient, metrics.getK8s().getType());
        //3. 组装采集数据到builder中
        if(null==k8sMetricsModel || k8sMetricsModel.getMetricsMap().isEmpty()){
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("kubernetes collect has no data!");
            return;
        }
        fillK8sMetricsToBuilder(builder, metrics, k8sMetricsModel);
        log.info("kubernetes collect finish in {}ms.", System.currentTimeMillis()-startTime);
    }

    /**
     * 填充获取到的k8s指标数据
     * @param builder 被填充对象
     * @param metrics 指标信息
     * @param k8sMetricsModel 填充内容
     * */
    private void fillK8sMetricsToBuilder(Builder builder, Metrics metrics, @NotNull K8sMetricsModel k8sMetricsModel) {
        try{
            Map<String, List<String>> metricsMap = k8sMetricsModel.getMetricsMap();
            List<String> metricsList = metrics.getAliasFields();
            int num = k8sMetricsModel.getNumber();
            for(int i=0; i<num; i++){
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                List<String> columnData;
                for(String column: metricsList){
                    columnData = metricsMap.get(column);
                    if(columnData==null){
                        valueRowBuilder.addColumns(StringUtils.EMPTY);
                    }else{
                        valueRowBuilder.addColumns(columnData.get(i));
                    }
                }
                builder.addValues(valueRowBuilder.build());
            }
        }catch (Exception e){
            log.error("填充k8s指标数据发生错误:{}", e.getMessage());
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("kubernetes collect failed from fillK8sMetricsToBuilder!");
        }
    }

    /**
     * 初始化k8s客户端
     * @param builder builder
     * @param metrics 采集指标信息，包含 K8sProtocol
     * @return 初始化成功返回K8sClient实例，否则返回Null
     * */
    @Nullable
    private K8sClient initK8sClient(Builder builder, Metrics metrics){
        if(null==metrics || null==metrics.getK8s()){
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("kubernetes collect must has k8s params");
        }else{
            K8sProtocol k8sProtocol = metrics.getK8s();
            try{
                K8sClient k8sClient = new K8sClient(k8sProtocol.getHost(), k8sProtocol.getPort(),
                    k8sProtocol.getToken());
                log.info("初始化k8s客户端成功，客户端连接k8s集群host:{},port:{}!",k8sProtocol.getHost(), k8sProtocol.getPort());
                return k8sClient;
            }catch (RuntimeException e){
                log.error("初始化k8s客户端出错，错误详情：{}", e.getMessage());
            }
        }
        return null;
    }

    /**
     * k8sClient采集数据
     * 根据不同k8s指标类型，采用不同的采集方式获取指标,类型包括：节点node、命名空间namespace、pod
     * @param k8sClient k8s客户端
     * @param type k8s指标类型
     * @return 返回k8s指标数据
     * */
    @Nullable
    private K8sMetricsModel getK8sMetricsByType(@NotNull K8sClient k8sClient, @NotEmpty String type){
        K8sMetricsModel k8sMetricsModel = null;
        switch (type){
            case K8sMetricsUtil.K8S_TYPE_NODE:
                k8sMetricsModel = getNodeMetrics(k8sClient);
                break;
            case K8sMetricsUtil.K8S_TYPE_NAMESPACE:
                k8sMetricsModel = getNamespaceMetrics(k8sClient);
                break;
            case K8sMetricsUtil.K8S_TYPE_POD:
                k8sMetricsModel = getPodMetrics(k8sClient);
                break;
            default:
                break;
        }
        return k8sMetricsModel;
    }

    /**
     * 采集k8s节点指标数据
     * @param k8sClient k8s客户端
     * @return 返回k8s指标模型
     * */
    @Nullable
    private K8sMetricsModel getNodeMetrics(@NotNull K8sClient k8sClient) {
        K8sMetricsModel k8sMetricsModel = null;
        V1NodeList allNodes = k8sClient.getAllNodes();
        if(null!=allNodes && CollectionUtils.isNotEmpty(allNodes.getItems())){
            List<String> metricsList = K8sMetricsUtil.retrieveNodeMetricsList();
            Map<String, List<String>> metricsMap = K8sMetricsUtil.retrieveNodeMetricsData(allNodes);
            if(CollectionUtils.isNotEmpty(metricsList)
                && null!=metricsMap
                && CollectionUtils.isNotEmpty(metricsMap.keySet())){
                int instanceNum = 0;
                for(Entry<String, List<String>> ele : metricsMap.entrySet()){
                    instanceNum = ele.getValue().size();
                    break;
                }
                k8sMetricsModel = new K8sMetricsModel(instanceNum, metricsList, metricsMap);
            }else{
                log.error("获取节点指标信息失败，节点指标列表不存在！");
            }
        }else{
            log.error("获取节点指标信息失败，节点不存在！");
        }
        return k8sMetricsModel;
    }

    /**
     * 采集k8s命名空间指标数据
     * @param k8sClient k8s客户端
     * @return 返回k8s指标模型
     * */
    private K8sMetricsModel getNamespaceMetrics(@NotNull K8sClient k8sClient) {
        K8sMetricsModel k8sMetricsModel = null;
        V1NamespaceList allNamespaces = k8sClient.getAllNamespaces();
        if(null!=allNamespaces && CollectionUtils.isNotEmpty(allNamespaces.getItems())){
            List<String> metricsList = K8sMetricsUtil.retrieveNamespaceMetricsList();
            Map<String, List<String>> metricsMap = K8sMetricsUtil.retrieveNamespaceMetricsData(allNamespaces);
            if(CollectionUtils.isNotEmpty(metricsList)
                && null!=metricsMap
                && CollectionUtils.isNotEmpty(metricsMap.keySet())){
                int instanceNum = 0;
                for(Entry<String, List<String>> ele : metricsMap.entrySet()){
                    instanceNum = ele.getValue().size();
                    break;
                }
                k8sMetricsModel = new K8sMetricsModel(instanceNum, metricsList, metricsMap);
            }else{
                log.error("获取k8s命名空间指标信息失败，命名空间指标列表不存在！");
            }
        }else{
            log.error("获取k8s命名空间指标信息失败，命名空间不存在！");
        }
        return k8sMetricsModel;
    }

    private K8sMetricsModel getPodMetrics(@NotNull K8sClient k8sClient) {
        K8sMetricsModel k8sMetricsModel = null;
        V1PodList allPods = k8sClient.getAllPodList();
        if(null!=allPods && CollectionUtils.isNotEmpty(allPods.getItems())){
            List<String> metricsList = K8sMetricsUtil.retrievePodMetricsList();
            Map<String, List<String>> metricsMap = K8sMetricsUtil.retrievePodMetricsData(allPods);
            if(CollectionUtils.isNotEmpty(metricsList)
                && null!=metricsMap
                && CollectionUtils.isNotEmpty(metricsMap.keySet())){
                int instanceNum = 0;
                for(Entry<String, List<String>> ele : metricsMap.entrySet()){
                    instanceNum = ele.getValue().size();
                    break;
                }
                k8sMetricsModel = new K8sMetricsModel(instanceNum, metricsList, metricsMap);
            }else{
                log.error("获取k8s命名空间指标信息失败，命名空间指标列表不存在！");
            }
        }else{
            log.error("获取k8s命名空间指标信息失败，命名空间不存在！");
        }
        return k8sMetricsModel;
    }

    private static class Singleton {
        private static final K8sCollectImpl INSTANCE = new K8sCollectImpl();
    }

//    @Override
//    public void afterPropertiesSet() throws Exception {
//        CollectStrategyFactory.register(DispatchConstants.PROTOCOL_K8S, this);
//    }

}
