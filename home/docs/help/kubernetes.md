---
id: kubernetes   
Title: Monitoring Kubernetes
sidebar_label: Kubernetes Monitor
keywords: [open source monitoring tool, open source kubernetes monitoring tool, monitoring kubernetes metrics]
---

> Collect and monitor the general performance metrics of Kubernetes.

## Pre-monitoring operations

If you want to monitor the information in 'Kubernetes', you need to obtain an authorization token that can access the API Server, so that the collection request can obtain the corresponding information.

Refer to the steps to obtain token

### method one

1. Create a service account and bind the default cluster-admin administrator cluster role

    ```kubectl create serviceaccount dashboard-admin -n kube-system```

2. User Authorization

    ```shell
    kubectl create clusterrolebinding dashboard-admin --clusterrole=cluster-admin --serviceaccount=kube-system:dashboard-admin
    kubectl -n kube-system get secret | grep dashboard-admin | awk '{print $1}'
    kubectl describe secret {secret} -n kube-system
    ```

### method two

```shell
kubectl create serviceaccount cluster-admin
kubectl create clusterrolebinding cluster-admin-manual --clusterrole=cluster-admin --serviceaccount=default:cluster-admin
kubectl create token --duration=1000h cluster-admin
```

### Configure parameters

|       Parameter name        |                                                            Parameter Help describes the                                                             |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| Monitor Host                | THE MONITORED PEER IPV4, IPV6 OR DOMAIN NAME. Note ⚠️ that there are no protocol headers (eg: https://, http://).                                   |
| Monitoring Name             | A name that identifies this monitoring that needs to be unique.                                                                                     |
| APiServer port              | K8s APiServer port, default 6443                                                                                                                    |
| token                       | Authorize the Access Token                                                                                                                          |
| URL                         | The database connection URL is optional, if configured, the database name, user name and password parameters in the URL will override the parameter | configured above                              |
| The acquisition interval is | Monitor the periodic data acquisition interval, in seconds, and the minimum interval that can be set is 30 seconds                                  |
| Whether to probe the        | Whether to check the availability of the monitoring before adding a monitoring is successful, and the new modification operation                    | will continue only if the probe is successful |
| Description Comment         | For more information identifying and describing the remarks for this monitoring, users can remark the information here                              |

### Collect metrics

#### metric collection: nodes

|    Metric Name     | metric unit | Metrics help describe |
|--------------------|-------------|-----------------------|-----------|
| node_name          | None        | Node name             |
| is_ready           | None        | Node Status           |
| capacity_cpu       | None        | CPU capacity          |
| allocatable_cpu    | None        | CPU                   | allotted  |
| capacity_memory    | None        | Memory capacity       |
| allocatable_memory | None        | Memory                | allocated |
| creation_time      | None        | Node creation time    |

#### metric Collection: namespaces

|  Metric Name  | metric unit | Metrics help describe |
|---------------|-------------|-----------------------|
| namespace     | None        | namespace name        |
| status        | None        | Status                |
| creation_time | None        | Created               |

#### metric collection: pods

|  Metric Name  | metric unit |     Metrics help describe     |
|---------------|-------------|-------------------------------|--------------------------|
| pod           | None        | Pod name                      |
| namespace     | None        | The namespace                 | to which the pod belongs |
| status        | None        | Pod status                    |
| restart       | None        | Number of restarts            |
| host_ip       | None        | The IP address of the host is |
| pod_ip        | None        | pod ip                        |
| creation_time | None        | Pod creation time             |
| start_time    | None        | Pod startup time              |

#### metric Collection: services

|  Metric Name  | metric unit |                   Metrics help describe                   |
|---------------|-------------|-----------------------------------------------------------|------------------------------|
| service       | None        | Service Name                                              |
| namespace     | None        | The namespace                                             | to which the service belongs |
| type          | None        | Service Type ClusterIP NodePort LoadBalancer ExternalName |
| cluster_ip    | None        | cluster ip                                                |
| selector      | None        | tag selector matches                                      |
| creation_time | None        | Created                                                   |
