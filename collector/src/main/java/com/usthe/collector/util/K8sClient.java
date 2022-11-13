package com.usthe.collector.util;

import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.ApiException;
import io.kubernetes.client.openapi.Configuration;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1NamespaceList;
import io.kubernetes.client.openapi.models.V1NodeList;
import io.kubernetes.client.openapi.models.V1PodList;
import io.kubernetes.client.util.ClientBuilder;
import io.kubernetes.client.util.credentials.AccessTokenAuthentication;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Call;

import javax.annotation.Nullable;

/**
 * 访问K8sAPI服务器的客户端，用来获取k8s环境下pod信息
 * @author myth
 * @date 2022/7/20 15:31
 */
@Slf4j
@Getter
public class K8sClient {
    /**
     * k8s-api客户端
     */
    private final ApiClient apiClient;

    /**
     * 构建集群外通过token访问的客户端
     */
    public K8sClient(String serverHost, String serverPort, String token) {
        try {
            String serverIp = "https://" + serverHost + ":" + serverPort;
            this.apiClient = new ClientBuilder()
                    .setBasePath(serverIp)
                    .setVerifyingSsl(false)
                    .setAuthentication(new AccessTokenAuthentication(token))
                    .build();

            Configuration.setDefaultApiClient(this.apiClient);
        } catch (Exception e) {
            throw new RuntimeException("构建K8s-Client异常");
        }
    }

  /**
   * 获取当前k8s环境中所有的节点 nodes
   * @return 类型 V1NodeList k8s节点列表
   */
  @Nullable
  public V1NodeList getAllNodes() {
    // new a CoreV1Api
    CoreV1Api api = new CoreV1Api(apiClient);

    // invokes the CoreV1Api client
    try {
        return api.listNode(null, null, null, null, null, null, null, null, null);
    } catch (ApiException e) {
      log.error("获取k8s节点异常:" + e.getResponseBody(), e);
    }
    return null;
  }

  /**
   * 获取当前k8s环境中所有的命名空间 namespaces
   * @return 类型 V1NamespaceList k8s命名空间列表
   */
  @Nullable
  public V1NamespaceList getAllNamespaces() {
    // new a CoreV1Api
    CoreV1Api api = new CoreV1Api(apiClient);

    // invokes the CoreV1Api client
    try {
        return api
            .listNamespace(null, null, null, null, null, null, null, null, null);
    } catch (ApiException e) {
      log.error("获取k8s命名空间异常:" + e.getResponseBody(), e);
    }
    return null;
  }

    /**
     * 获取所有的Pod
     * @return podList
     */
    @Nullable
    public V1PodList getAllPodList() {
        // new a CoreV1Api
        CoreV1Api api = new CoreV1Api(apiClient);

        // invokes the CoreV1Api client
        try {
            return api.listPodForAllNamespaces(null, null, null, null, null, null, null, null, null);
        } catch (ApiException e) {
            log.error("获取k8s Pod异常:" + e.getResponseBody(), e);
        }
        return null;
    }

  /**
   * 根据namespace获取所有的pod信息
   * @return Call
   */
  public Call getAllPodListByNamespace(String namespace) {
    CoreV1Api api = new CoreV1Api(apiClient);
    try {
        return api.listNamespacedPodCall(namespace, null, null, null, null, null, null, null, null,null,null);
    } catch (ApiException e) {
      log.error("根据namespace获取podlist异常:" + e.getResponseBody(), e);
      return null;
    }
  }


}
