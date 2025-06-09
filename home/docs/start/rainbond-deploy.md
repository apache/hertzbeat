---
id: rainbond-deploy  
title: Use Rainbond Deploy HertzBeat    
sidebar_label: Install via Rainbond
---

If you are unfamiliar with Kubernetes, and want to install Apache HertzBeat (incubating) in Kubernetes, you can use Rainbond to deploy. Rainbond is a cloud-native application management platform built on Kubernetes and simplifies the application deployment to Kubernetes.

## Rainbond Cloud deployment

If you want to deploy "HertzBeat" on "Rainbond Cloud" in one click, you can follow the steps below to do so.

- Open the details of the [HertzBeat application](https://hub.grapps.cn/marketplace/apps/753)

![HertzBeat app desc](/img/docs/start/hertzbeat-desc.png)

- Log in to your Rainbond Cloud account. If you don't have an account, register one in advance!

![Rainbond Cloud](/img/docs/start/rainbond-cloud.png)

- Select the version for installation

![hertzbeat versions](/img/docs/start/hertzbeat-versions.png)

## Open-source Rainbond deployment

### Prerequisites

To install Rainbond, please refer to [Rainbond Quick Install](https://www.rainbond.com/docs/quick-start/quick-install)。

### Deploy HertzBeat

After logging in Rainbond, click Market in the left menu, switch to open source app store, and search HertzBeat in the search box, and click the Install button.

![HertzBeat](/img/docs/start/install-to-rainbond-en.png)

Fill in the following information, and click Confirm button to install.

- Team: select a team or create a new team
- Cluster: select a cluster
- Application: select an application or create a new application
- Version: select a version

After installation, HertzBeat can be accessed via the Access button.

![HertzBeat](/img/docs/start/hertzbeat-topology-en.png)

:::tip
HertzBeat installed via Rainbond, External Mysql database and Redis and IoTDB are used by default, The HertzBeat configuration file is also mounted, which can be modified in `Components -> Environment Configuration -> Configuration File Settings`.
:::
