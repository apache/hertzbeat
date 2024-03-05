# Helm Chart for HertzBeat

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/hertzbeat)](https://artifacthub.io/packages/search?repo=hertzbeat)

<div class="artifacthub-widget" data-url="https://artifacthub.io/packages/helm/hertzbeat/hertzbeat" data-theme="light" data-header="true" data-stars="true" data-responsive="false"><blockquote><p lang="en" dir="ltr"><b>hertzbeat</b>: An open-source, real-time monitoring system with custom monitoring, high performance cluster and agentless capabilities.</p>&mdash; Open in <a href="https://artifacthub.io/packages/helm/hertzbeat/hertzbeat">Artifact Hub</a></blockquote></div><script async src="https://artifacthub.io/artifacthub-widget.js"></script>


## What is HertzBeat?

> An open-source, real-time monitoring system with custom monitoring, high performance cluster and agentless capabilities. | 易用友好的开源实时监控告警系统，无需Agent，高性能集群，强大自定义监控能力.

### Features

* Combines **monitoring, alarm, and notification** features into one platform, and supports monitoring for web service, program, database, cache, os, webserver, middleware, bigdata, cloud-native, network, custom and more.
* Easy to use and agentless, offering full web-based operations for monitoring and alerting with just a few clicks, all at zero learning cost.
* Makes protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, allowing you to collect any metrics by simply configuring the template `YML` file online. Imagine being able to quickly adapt to a new monitoring type like K8s or Docker simply by configuring online with HertzBeat.
* High performance, supports horizontal expansion of multi-collector clusters, multi-isolated network monitoring and cloud-edge collaboration.
* Provides flexible alarm threshold rules and timely notifications delivered via  `Discord` `Slack` `Telegram` `Email` `Dingtalk` `WeChat` `FeiShu` `Webhook` `SMS` `ServerChan`.


> HertzBeat's powerful customization, multi-type support, high performance, easy expansion, and low coupling, aims to help developers and teams quickly build their own monitoring system.      
> We also provide **[SaaS Monitoring Cloud](https://console.tancloud.cn)**, users no longer need to deploy a cumbersome monitoring system to monitor their resources. **[Get started online for free](https://console.tancloud.cn)**.

## Helm Chart for HertzBeat

This [Helm](https://github.com/kubernetes/helm) chart installs [HertzBeat](https://github.com/dromara/hertzbeat) in a Kubernetes cluster. Welcome to [contribute](https://github.com/dromara/hertzbeat/tree/master/script/helm) to Helm Chart for HertzBeat.

## Prerequisites

- Kubernetes cluster 1.20+
- Helm v3.2.0+

## Installation

### Add Helm repository

```bash
helm repo add hertzbeat https://charts.hertzbeat.com/
helm repo update
```

### Configure the chart

The following items can be set via `--set` flag during installation or configured by editing the `values.yaml` directly (need to download the chart first).

#### Configure how to expose HertzBeat service

- **Ingress**: The ingress controller must be installed in the Kubernetes cluster.
- **ClusterIP**: Exposes the service on a cluster-internal IP. Choosing this value makes the service only reachable from within the cluster.
- **NodePort**: Exposes the service on each Node’s IP at a static port (the NodePort). You’ll be able to contact the NodePort service, from outside the cluster, by requesting `NodeIP:NodePort`.
- **LoadBalancer**: Exposes the service externally using a cloud provider’s load balancer.

#### Configure the external URL

The external URL for HertzBeat core service is used to:

1. populate the docker/helm commands showed on portal
2. populate the token service URL returned to docker client

Format: `protocol://domain[:port]`. Usually:

- if service exposed via `Ingress`, the `domain` should be the value of `expose.ingress.hosts`
- if service exposed via `ClusterIP`, the `domain` should be the value of `expose.clusterIP.name`
- if service exposed via `NodePort`, the `domain` should be the IP address of one Kubernetes node
- if service exposed via `LoadBalancer`, set the `domain` as your own domain name and add a CNAME record to map the domain name to the one you got from the cloud provider

If HertzBeat is deployed behind the proxy, set it as the URL of proxy.

#### Configure how to persist data

- **Disable**: The data does not survive the termination of a pod.
- **Persistent Volume Claim(default)**: A default `StorageClass` is needed in the Kubernetes cluster to dynamically provision the volumes. Specify another StorageClass in the `storageClass` or set `existingClaim` if you already have existing persistent volumes to use.

#### Configure the other items listed in [configuration](#configuration) section

### Install the chart

Install the HertzBeat helm chart with a release name `my-release`:
```bash
helm install hertzbeat hertzbeat/hertzbeat
```

## Uninstallation

To uninstall/delete the `hertzbeat` deployment:
```bash
helm uninstall hertzbeat
```

## Configuration

The following table lists the configurable parameters of the HertzBeat chart and the default values.

| Parameter                             | Description                                                                                                                                                                                                     | Default         |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|
| **Expose**                            |                                                                                                                                                                                                                 |                 |
| `expose.type`                         | How to expose the service: `Ingress`, `ClusterIP`, `NodePort` or `LoadBalancer`, other values will be ignored and the creation of service will be skipped.                                                      | `Ingress`       |
| `expose.clusterIP.name`               | The name of ClusterIP service                                                                                                                                                                                   | `hertzbeat`     |
| `expose.clusterIP.annotations`        | The annotations attached to the ClusterIP service                                                                                                                                                               | {}              |
| `expose.clusterIP.ports.port`         | The service port HertzBeat listens on when serving HTTP                                                                                                                                                         | `80`            |
| `expose.nodePort.name`                | The name of NodePort service                                                                                                                                                                                    | `hertzbeat`     |
| `expose.nodePort.ports.port`          | The service port HertzBeat listens on when serving HTTP                                                                                                                                                         | `80`            |
| `expose.nodePort.ports.nodePort`      | The node port HertzBeat listens on when serving HTTP                                                                                                                                                            | `30002`         |
| `expose.loadBalancer.IP`              | The IP of the loadBalancer. It only works when loadBalancer supports assigning IP                                                                                                                               | `""`            |
| `expose.loadBalancer.ports.port`      | The service port HertzBeat listens on when serving HTTP                                                                                                                                                         | `80`            |
| `expose.loadBalancer.sourceRanges`    | List of IP address ranges to assign to loadBalancerSourceRanges                                                                                                                                                 | []              |
| **Manager**                           |                                                                                                                                                                                                                 |                 |
| `manager.account.username`            | The hertzbeat account username                                                                                                                                                                                  | `admin`         |
| `manager.account.password`            | The hertzbeat account password                                                                                                                                                                                  | `hertzbeat`     |
| `manager.resources`                   | The [resources] to allocate for container                                                                                                                                                                       | undefined       |
| `manager.nodeSelector`                | Node labels for pod assignment                                                                                                                                                                                  | `{}`            |
| `manager.tolerations`                 | Tolerations for pod assignment                                                                                                                                                                                  | `[]`            |
| `manager.affinity`                    | Node/Pod affinities                                                                                                                                                                                             | `{}`            |
| `manager.podAnnotations`              | Annotations to add to the nginx pod                                                                                                                                                                             | `{}`            |
| **Collector**                         |                                                                                                                                                                                                                 |                 |
| `collector.replicaCount`              | The replica count                                                                                                                                                                                               | `1`             |
| `collector.autoscaling.enable`        | Is enable auto scaling collector replicas                                                                                                                                                                       | `1`             |
| `collector.resources`                 | The [resources] to allocate for container                                                                                                                                                                       | undefined       |
| `collector.nodeSelector`              | Node labels for pod assignment                                                                                                                                                                                  | `{}`            |
| `collector.tolerations`               | Tolerations for pod assignment                                                                                                                                                                                  | `[]`            |
| `collector.affinity`                  | Node/Pod affinities                                                                                                                                                                                             | `{}`            |
| `collector.podAnnotations`            | Annotations to add to the nginx pod                                                                                                                                                                             | `{}`            |
| **Database**                          |                                                                                                                                                                                                                 |                 |
| `database.timezone`                   | The database system timezone                                                                                                                                                                                    | `1`             |
| `database.rootPassword`               | The database root user password                                                                                                                                                                                 | `1`             |
| `database.persistence.enabled`        | Enable the data persistence or not                                                                                                                                                                              | `true`          |
| `database.persistence.resourcePolicy` | Setting it to `keep` to avoid removing PVCs during a helm delete operation. Leaving it empty will delete PVCs after the chart deleted. Does not affect PVCs created for internal database and redis components. | `keep`          |
| `database.persistence.existingClaim`  | Use the existing PVC which must be created manually before bound, and specify the `subPath` if the PVC is shared with other components                                                                          |                 |
| `database.persistence.storageClass`   | Specify the `storageClass` used to provision the volume. Or the default StorageClass will be used (the default). Set it to `-` to disable dynamic provisioning                                                  |                 |
| `database.persistence.subPath`        | The sub path used in the volume                                                                                                                                                                                 |                 |
| `database.persistence.accessMode`     | The access mode of the volume                                                                                                                                                                                   | `ReadWriteOnce` |
| `database.persistence.size`           | The size of the volume                                                                                                                                                                                          | `5Gi`           |
| `database.persistence.annotations`    | The annotations of the volume                                                                                                                                                                                   |                 |
| `database.resources`                  | The [resources] to allocate for container                                                                                                                                                                       | undefined       |
| `database.nodeSelector`               | Node labels for pod assignment                                                                                                                                                                                  | `{}`            |
| `database.tolerations`                | Tolerations for pod assignment                                                                                                                                                                                  | `[]`            |
| `database.affinity`                   | Node/Pod affinities                                                                                                                                                                                             | `{}`            |
| `database.podAnnotations`             | Annotations to add to the nginx pod                                                                                                                                                                             | `{}`            |
| **TSDB**                              |                                                                                                                                                                                                                 |                 |
| `tsdb.timezone`                       | The database system timezone                                                                                                                                                                                    | `1`             |
| `tsdb.persistence.enabled`            | Enable the data persistence or not                                                                                                                                                                              | `true`          |
| `tsdb.persistence.resourcePolicy`     | Setting it to `keep` to avoid removing PVCs during a helm delete operation. Leaving it empty will delete PVCs after the chart deleted. Does not affect PVCs created for internal database and redis components. | `keep`          |
| `tsdb.persistence.existingClaim`      | Use the existing PVC which must be created manually before bound, and specify the `subPath` if the PVC is shared with other components                                                                          |                 |
| `tsdb.persistence.storageClass`       | Specify the `storageClass` used to provision the volume. Or the default StorageClass will be used (the default). Set it to `-` to disable dynamic provisioning                                                  |                 |
| `tsdb.persistence.subPath`            | The sub path used in the volume                                                                                                                                                                                 |                 |
| `tsdb.persistence.accessMode`         | The access mode of the volume                                                                                                                                                                                   | `ReadWriteOnce` |
| `tsdb.persistence.size`               | The size of the volume                                                                                                                                                                                          | `5Gi`           |
| `tsdb.persistence.annotations`        | The annotations of the volume                                                                                                                                                                                   |                 |
| `tsdb.resources`                      | The [resources] to allocate for container                                                                                                                                                                       | undefined       |
| `tsdb.nodeSelector`                   | Node labels for pod assignment                                                                                                                                                                                  | `{}`            |
| `tsdb.tolerations`                    | Tolerations for pod assignment                                                                                                                                                                                  | `[]`            |
| `tsdb.affinity`                       | Node/Pod affinities                                                                                                                                                                                             | `{}`            |
| `tsdb.podAnnotations`                 | Annotations to add to the nginx pod                                                                                                                                                                             | `{}`            |


[resources]: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/
[hertzbeat]: https://github.com/dromara/hertzbeat/
[artifacthub]: https://artifacthub.io/
[helm]: https://helm.sh/

