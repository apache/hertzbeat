package com.usthe.collector.collect.microservice;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.http.HttpCollectImpl;
import com.usthe.collector.dispatch.entrance.internal.CollectJobService;
import com.usthe.collector.dispatch.entrance.internal.CollectResponseEventListener;
import com.usthe.collector.dispatch.export.MetricsDataExporter;
import com.usthe.collector.util.K8sClient;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.dispatch.MetricsTaskDispatch;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.job.protocol.ServiceProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.entity.message.CollectRep.MetricsData.Builder;
import com.usthe.common.model.ServicePodModel;
import com.usthe.common.support.SpringContextHolder;
import com.usthe.common.util.GsonUtil;
import io.kubernetes.client.openapi.models.V1PodList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * @author: myth
 * @Data: 2022/7/14 16:01
 * @Description: 物联微服务指标具体采集实现
 */
@Slf4j
public class MicroServiceParentCollectImpl extends AbstractCollect {

  @Autowired
  private MetricsTaskDispatch metricsTaskDispatch;

  @Autowired
  private CollectJobService collectJobService;

  public static MicroServiceParentCollectImpl getInstance() {
    return MicroServiceParentCollectImpl.Singleton.INSTANCE;
  }

  @Override
  public void collect(Builder builder, long appId, String app, Metrics metrics) {
    //1. 获取当前k8s环境下，特定mosquitto集群下的mosquitto实例所在pod信息
    // 准备连接k8s集群的配置信息
    ServiceProtocol serviceProtocol = metrics.getService();
    List<Metrics> childNode = metrics.getChildNode();
    String k8sAPIServHost = serviceProtocol.getK8sHost();
    String k8sAPIServPort = serviceProtocol.getK8sAPIServPort();
    String k8sAPIToken = serviceProtocol.getK8sAPIToken();
    // 初始化k8s客户端，获取特定pod信息
    K8sClient k8sClient = new K8sClient(k8sAPIServHost, k8sAPIServPort, k8sAPIToken);
    if(k8sClient.getApiClient()==null){
      log.info("Failed to get k8sAPIClient, k8sAPIServHost:{}, k8sAPIServPort:{}",
              k8sAPIServHost, k8sAPIServPort);
      builder.setCode(CollectRep.Code.FAIL);
      builder.setMsg("Failed to get k8sAPIClient");
      return;
    }
    //key:pod名称 value:host
    Map<String, ServicePodModel> podMap = new HashMap<>(16);
    //检查k8sAPI服务器是否连接成功，若不成功直接返回Null
    if(k8sClient!=null && k8sClient.getApiClient()!=null) {
      V1PodList podList = k8sClient.getAllPodList();
      AbstractParseResponse invoke = new JsonPathParseResponse();
      try {
        invoke.parseK8sApi(metrics,podList,podMap, metrics.getAliasFields(), metrics.getService(), builder, null);
      }catch (Exception e){
        log.error("Error in parseK8sApi, error details:{}", e.getMessage());
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg("Failed to get k8sAPIClient");
      }
    }
    if(podMap.isEmpty()){
      log.warn("warn in K8s, warn details: {} pod running is empty",app);
      return;
    }
    for(Map.Entry<String, ServicePodModel> mapEntry : podMap.entrySet()){
      Job job = new Job();
      job.setApp(app);
      job.setMonitorId(appId);
      job.setInterval(0);
      job.setCyclic(false);
      job.setTimestamp(System.currentTimeMillis());
      ServicePodModel model = mapEntry.getValue();
      List<Configmap> configmap = new ArrayList<>();
      job.setConfigmap(configmap);
      childNode.forEach(metric -> {
        HttpProtocol http = GsonUtil.fromJson(GsonUtil.toJson(serviceProtocol.getHttp()), HttpProtocol.class);
          http.setHost(model.getPodHost());
          http.setPort(model.getPodPort());
          metric.setHttp(http);
          metric.setParentMetrics(model.getMetricsMap());
      });
      job.setMetrics(childNode);
      //下发一次性微服务采集任务
      collectJobService.collectSyncJobData(job);

    }
  }

  private static class Singleton {
    private static final MicroServiceParentCollectImpl INSTANCE = new MicroServiceParentCollectImpl();
  }
}
