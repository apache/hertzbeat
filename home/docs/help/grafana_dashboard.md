---
id: grafana_dashboard  
title: Grafana Dashboard      
sidebar_label: Grafana Historical Charts   
keywords: [Grafana, Historical Dashboard]
---

> `Grafana` is an open source visualization and analytics platform that helps you easily create, share and monitor dashboards. In this article, we will cover how to use `Grafana` to display historical data in `HertzBeat`.

### Prerequisites

- The `Grafana` version 8.1.0 or later is installed and running.
- The `Grafana` service is started and the account password is configured.
- The `HertzBeat` service is started and the `VictoriaMetrics` time-series database is configured (note: the `VictoriaMetrics` data source is required).

:::caution Caution.
`Grafana` can only show historical data for `Prometheus` type of monitoring, currently it does not support monitoring data defined by `yml` in `HertzBeat`.
:::

### enable Grafana embedded url

ref: <https://grafana.com/blog/2023/10/10/how-to-embed-grafana-dashboards-into-web-applications/>
In the `Grafana` configuration file `grafana.ini`, set the `allow_embedding = true`.
In the `Grafana` configuration file `grafana.ini`, set the `[auth.anonymous]` option to `true`.

```ini
allow_embedding = true
[auth.anonymous]
# enable anonymous access
enabled = true
```

### Configuring Grafana in HertzBeat

In the configuration file `application.yml` in `HertzBeat`, configure the `Grafana` data source.

```yaml
grafana:
  enabled: true
  url: http://127.0.0.1:3000
  username: admin
  password: admin
```

### Upload Grafana monitor template json file in HertzBeat monitor

In `HertzBeat`, when creating or editing a `Prometheus` type monitor, click Enable Grafana Templates and select the Grafana template json file to upload.
The monitor template json file can be downloaded at <https://grafana.com/grafana/dashboards/>.
For example, create a new monitor in `HertzBeat` for `VictoriaMetrics` single node, then open <https://grafana.com/grafana/dashboards/10229-victoriametrics-single-node/>, click `Download JSON` button on the right side. `Download JSON` button on the right to download the template json file. Upload the template json file in the `HertzBeat` monitor, save it.
    ![grafana-1.png](/img/docs/help/grafana-1.png)

### View Grafana historical charts

On the `HertzBeat` monitoring page, click the `Grafana` button, select `Grafana` Historical Charts, select a monitoring template, and click the `Query` button to view the `Grafana` historical charts.
    ![grafana-2.png](/img/docs/help/grafana-2.png)
