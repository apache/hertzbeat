package com.usthe.collector.collect.k8s;

import com.usthe.common.util.GsonUtil;
import io.kubernetes.client.custom.Quantity;
import io.kubernetes.client.openapi.models.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;

import javax.annotation.Nullable;
import java.util.*;


/**
 * k8s指标采集工具类：常量定义、参数解析
 * @author myth
 * @date 2022/10/08 15:44
 */
@Slf4j
public class K8sMetricsUtil {
    /**
     * k8s指标类型
     * */
    public static final String K8S_TYPE_NODE = "node";
    public static final String K8S_TYPE_NAMESPACE = "namespace";
    public static final String K8S_TYPE_POD = "pod";

    /**
     * node指标类型 指标
     * */
    public static final int NODE_METRICS_COUNT = 8;
    public static final String NODE_METRICS_NODE_NAME = "node_name";
    public static final String NODE_METRICS_LABELS = "labels";
    public static final String NODE_METRICS_IS_READY = "is_ready";
    public static final String NODE_METRICS_CAPACITY_CPU = "capacity_cpu";
    public static final String NODE_METRICS_ALLOCATABLE_CPU = "allocatable_cpu";
    public static final String NODE_METRICS_CAPACITY_MEMORY = "capacity_memory";
    public static final String NODE_METRICS_ALLOCATABLE_MEMORY = "allocatable_memory";
    public static final String NODE_METRICS_CREATION_TIME = "creation_time";

    /**
     *  namespace指标类型 指标
     * */
    public static final int NAMESPACE_METRICS_COUNT = 3;
    public static final String NAMESPACE_METRICS_NAMESPACE_NAME = "namespace_name";
    public static final String NAMESPACE_METRICS_LABELS = "labels";
    public static final String NAMESPACE_METRICS_CREATION_TIME = "creation_time";

    /**
     *  pod指标类型 指标
     * */
    public static final int POD_METRICS_COUNT = 7;
    public static final String POD_METRICS_POD_NAME = "pod_name";
    public static final String POD_METRICS_LABELS = "labels";
    public static final String POD_METRICS_NAMESPACE_NAME = "namespace_name";
    public static final String POD_METRICS_POD_STATUS = "pod_status";
    public static final String POD_METRICS_IMAGES = "images";
    public static final String POD_METRICS_RESTART = "restart";
    public static final String POD_METRICS_CREATION_TIME = "creation_time";

    /**
     * 获取k8s节点指标列表，预置数据
     * @return List<String> 节点指标列表
     * */
    //todo Arrays.asList() && 不应该写成方法
    public static List<String> retrieveNodeMetricsList() {
        List<String> nodeMetricsList = new ArrayList<>(NODE_METRICS_COUNT);
        nodeMetricsList.add(NODE_METRICS_NODE_NAME);
        nodeMetricsList.add(NODE_METRICS_LABELS);
        nodeMetricsList.add(NODE_METRICS_IS_READY);
        nodeMetricsList.add(NODE_METRICS_CAPACITY_CPU);
        nodeMetricsList.add(NODE_METRICS_ALLOCATABLE_CPU);
        nodeMetricsList.add(NODE_METRICS_CAPACITY_MEMORY);
        nodeMetricsList.add(NODE_METRICS_ALLOCATABLE_MEMORY);
        nodeMetricsList.add(NODE_METRICS_CREATION_TIME);
        return nodeMetricsList;
    }

    /**
     * 获取k8s命名空间指标列表，预置数据
     * @return List<String> 命名空间指标列表
     * */
    public static List<String> retrieveNamespaceMetricsList() {
        List<String> namespaceMetricsList = new ArrayList<>(NAMESPACE_METRICS_COUNT);
        namespaceMetricsList.add(NAMESPACE_METRICS_NAMESPACE_NAME);
        namespaceMetricsList.add(NAMESPACE_METRICS_LABELS);
        namespaceMetricsList.add(NAMESPACE_METRICS_CREATION_TIME);
        return namespaceMetricsList;
    }

    /**
     * 获取k8s pod指标列表，预置数据
     * @return List<String> pod指标列表
     * */
    public static List<String> retrievePodMetricsList() {
        List<String> podMetricsList = new ArrayList<>(POD_METRICS_COUNT);
        podMetricsList.add(POD_METRICS_POD_NAME);
        podMetricsList.add(POD_METRICS_LABELS);
        podMetricsList.add(POD_METRICS_POD_STATUS);
        podMetricsList.add(POD_METRICS_IMAGES);
        podMetricsList.add(POD_METRICS_RESTART);
        podMetricsList.add(POD_METRICS_CREATION_TIME);
        podMetricsList.add(POD_METRICS_NAMESPACE_NAME);
        return podMetricsList;
    }

    /**
     * 提取k8s节点指标数据
     * @param allNodes 节点对象
     * @return Map<String, List<String>> 节点指标数据
     * */
    @Nullable
    public static Map<String, List<String>> retrieveNodeMetricsData(V1NodeList allNodes) {
        //参数校验
        if(null==allNodes || CollectionUtils.isEmpty(allNodes.getItems())){
            log.error("k8s客户端获取V1NodeList allNodes节点信息为空！");
            return null;
        }
        //初始化metricsMap
        Map<String, List<String>> nodeMetricsMap = new HashMap<>(NODE_METRICS_COUNT);
        retrieveNodeMetricsList().forEach(nodeMetrics -> nodeMetricsMap.put(nodeMetrics, new ArrayList<>()));
        //填充指标 拓展点（可以添加其他指标，填充到nodeMetricsMap中）
        for(V1Node v1Node : allNodes.getItems()){
            //提取 node_name
            if(v1Node.getMetadata()!=null){
                nodeMetricsMap.get(NODE_METRICS_NODE_NAME).add(v1Node.getMetadata().getName());
            }else{
                nodeMetricsMap.get(NODE_METRICS_NODE_NAME).add(StringUtils.EMPTY);
            }
            //提取 labels
            if(v1Node.getMetadata()!=null){
                nodeMetricsMap.get(NODE_METRICS_LABELS).add(GsonUtil.toJson(v1Node.getMetadata().getLabels()));
            }else{
                nodeMetricsMap.get(NODE_METRICS_LABELS).add(StringUtils.EMPTY);
            }
            //提取 is_ready
            if(v1Node.getStatus()!=null && v1Node.getStatus().getConditions()!=null){
                v1Node.getStatus().getConditions().forEach(ele->{
                    if("Ready".equals(ele.getType())){
                        nodeMetricsMap.get(NODE_METRICS_IS_READY).add(ele.getStatus());
                    }
                });
            }else{
                nodeMetricsMap.get(NODE_METRICS_IS_READY).add(StringUtils.EMPTY);
            }
            //提取 capacity_cpu capacity_memory
            if(v1Node.getStatus()!=null && v1Node.getStatus().getCapacity()!=null){
                Quantity quantity = v1Node.getStatus().getCapacity().get("cpu");
                if(quantity!=null){
                    nodeMetricsMap.get(NODE_METRICS_CAPACITY_CPU).add(quantity.toString());
                }else{
                    nodeMetricsMap.get(NODE_METRICS_CAPACITY_CPU).add(StringUtils.EMPTY);
                }
                quantity = v1Node.getStatus().getCapacity().get("memory");
                if(quantity!=null){
                    nodeMetricsMap.get(NODE_METRICS_CAPACITY_MEMORY).add(quantity.toString());
                }else{
                    nodeMetricsMap.get(NODE_METRICS_CAPACITY_MEMORY).add(StringUtils.EMPTY);
                }
            }else{
                nodeMetricsMap.get(NODE_METRICS_CAPACITY_CPU).add(StringUtils.EMPTY);
                nodeMetricsMap.get(NODE_METRICS_CAPACITY_MEMORY).add(StringUtils.EMPTY);
            }

            //提取 allocatable_cpu allocatable_memory
            if(v1Node.getStatus()!=null && v1Node.getStatus().getAllocatable()!=null){
                Quantity quantity = v1Node.getStatus().getAllocatable().get("cpu");
                if(quantity!=null){
                    nodeMetricsMap.get(NODE_METRICS_ALLOCATABLE_CPU).add(quantity.toString());
                }else{
                    nodeMetricsMap.get(NODE_METRICS_ALLOCATABLE_MEMORY).add(StringUtils.EMPTY);
                }
                quantity = v1Node.getStatus().getAllocatable().get("memory");
                if(quantity!=null){
                    nodeMetricsMap.get(NODE_METRICS_CAPACITY_MEMORY).add(quantity.toString());
                }else{
                    nodeMetricsMap.get(NODE_METRICS_ALLOCATABLE_MEMORY).add(StringUtils.EMPTY);
                }
            }else{
                nodeMetricsMap.get(NODE_METRICS_ALLOCATABLE_CPU).add(StringUtils.EMPTY);
                nodeMetricsMap.get(NODE_METRICS_ALLOCATABLE_MEMORY).add(StringUtils.EMPTY);
            }

            //提取 creation_time
            if(v1Node.getMetadata()!=null && v1Node.getMetadata().getCreationTimestamp()!=null){
                nodeMetricsMap.get(NODE_METRICS_CREATION_TIME)
                    .add(v1Node.getMetadata().getCreationTimestamp().toString());
            }else{
                nodeMetricsMap.get(NODE_METRICS_CREATION_TIME).add(StringUtils.EMPTY);
            }
            //todo:可以添加其他指标获取，注意，需要定义新的静态变量并添加到 retrieveNodeMetricsList 方法中

        }
        return nodeMetricsMap;
    }

    /**
     * 提取k8s命名空间指标数据
     * @param allNamespaces 命名空间对象
     * @return Map<String, List<String>> 节点指标数据
     * */
    public static Map<String, List<String>> retrieveNamespaceMetricsData(
        V1NamespaceList allNamespaces) {
        //参数校验
        if(null==allNamespaces || CollectionUtils.isEmpty(allNamespaces.getItems())){
            log.error("k8s客户端获取V1NamespaceList allNamespaces节点信息为空！");
            return null;
        }
        Map<String, List<String>> namespaceMetricsMap = new HashMap<>(NODE_METRICS_COUNT);
        retrieveNamespaceMetricsList().forEach(namespaceMetrics -> namespaceMetricsMap.put(namespaceMetrics, new ArrayList<>()));
        for(V1Namespace v1Namespace : allNamespaces.getItems()){
            //提取 node_name
            if(v1Namespace.getMetadata()!=null){
                namespaceMetricsMap.get(NAMESPACE_METRICS_NAMESPACE_NAME)
                    .add(v1Namespace.getMetadata().getName());
            }else{
                namespaceMetricsMap.get(NAMESPACE_METRICS_NAMESPACE_NAME).add(StringUtils.EMPTY);
            }
            //提取 labels
            if(v1Namespace.getMetadata()!=null){
                namespaceMetricsMap.get(NAMESPACE_METRICS_LABELS).add(GsonUtil.toJson(v1Namespace.getMetadata().getLabels()));
            }else{
                namespaceMetricsMap.get(NAMESPACE_METRICS_LABELS).add(StringUtils.EMPTY);
            }
            //提取 creation_time
            if(v1Namespace.getMetadata()!=null && v1Namespace.getMetadata().getCreationTimestamp()!=null){
                namespaceMetricsMap.get(NAMESPACE_METRICS_CREATION_TIME)
                    .add(v1Namespace.getMetadata().getCreationTimestamp().toString());
            }else{
                namespaceMetricsMap.get(NAMESPACE_METRICS_CREATION_TIME).add(StringUtils.EMPTY);
            }
            //todo:可以添加其他指标获取，注意，需要定义新的静态变量并添加到 retrieveNamespaceMetricsList 方法中

        }
        return namespaceMetricsMap;
    }

    /**
     * 提取k8s pods指标数据
     * @param allPods pods对象
     * @return Map<String, List<String>> pods指标数据
     * */
    public static Map<String, List<String>> retrievePodMetricsData(V1PodList allPods) {
        //参数校验
        if(null==allPods || CollectionUtils.isEmpty(allPods.getItems())){
            log.error("k8s客户端获取V1PodList allPods节点信息为空！");
            return null;
        }
        Map<String, List<String>> podMetricsMap = new HashMap<>(NODE_METRICS_COUNT);
        retrievePodMetricsList().forEach(podMetrics -> podMetricsMap.put(podMetrics, new ArrayList<>()));
        for(V1Pod v1Pod : allPods.getItems()){
            //提取 pod_name
            if(v1Pod.getMetadata()!=null){
                podMetricsMap.get(POD_METRICS_POD_NAME).add(v1Pod.getMetadata().getName());
            }else{
                podMetricsMap.get(POD_METRICS_POD_NAME).add(StringUtils.EMPTY);
            }
            //提取 labels
            if(v1Pod.getMetadata()!=null){
                podMetricsMap.get(POD_METRICS_LABELS)
                    .add(GsonUtil.toJson(v1Pod.getMetadata().getLabels()));
            }else{
                podMetricsMap.get(POD_METRICS_LABELS).add(StringUtils.EMPTY);
            }
            //提取 namespace_name
            if(v1Pod.getMetadata()!=null){
                podMetricsMap.get(POD_METRICS_NAMESPACE_NAME).add(v1Pod.getMetadata().getNamespace());
            }else{
                podMetricsMap.get(POD_METRICS_NAMESPACE_NAME).add(StringUtils.EMPTY);
            }
            //提取 pod_status
            if(v1Pod.getStatus()!=null){
                podMetricsMap.get(POD_METRICS_POD_STATUS).add(v1Pod.getStatus().getPhase());
            }else{
                podMetricsMap.get(POD_METRICS_POD_STATUS).add(StringUtils.EMPTY);
            }
            //提取 images
            if(v1Pod.getSpec()!=null && v1Pod.getSpec().getContainers()!=null){
                StringBuilder stringBuilder = new StringBuilder();
                v1Pod.getSpec().getContainers().forEach(v1Container -> stringBuilder.append(v1Container.getImage()).append(";"));
                podMetricsMap.get(POD_METRICS_IMAGES).add(stringBuilder.toString());
            }else{
                podMetricsMap.get(POD_METRICS_IMAGES).add(StringUtils.EMPTY);
            }
            //提取 restart
            if(v1Pod.getStatus()!=null && v1Pod.getStatus().getContainerStatuses()!=null){
                int restartCount = v1Pod.getStatus().getContainerStatuses().stream()
                    .mapToInt(V1ContainerStatus::getRestartCount).sum();
                podMetricsMap.get(POD_METRICS_RESTART).add(String.valueOf(restartCount));
            }else{
                podMetricsMap.get(POD_METRICS_RESTART).add(StringUtils.EMPTY);
            }
            //提取 creation_time
            if(v1Pod.getMetadata()!=null && v1Pod.getMetadata().getCreationTimestamp()!=null){
                podMetricsMap.get(POD_METRICS_CREATION_TIME)
                    .add(v1Pod.getMetadata().getCreationTimestamp().toString());
            }else{
                podMetricsMap.get(POD_METRICS_CREATION_TIME).add(StringUtils.EMPTY);
            }
            //todo:可以添加其他指标获取，注意，需要定义新的静态变量，然后添加到 retrievePodMetricsList 方法中

        }
        return podMetricsMap;
    }
}
