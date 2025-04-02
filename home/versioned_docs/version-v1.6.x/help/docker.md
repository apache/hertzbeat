---
id: docker
title: Monitor：Docker Monitor      
sidebar_label: Docker Monitor
keywords: [open source monitoring tool, open source docker monitoring tool, monitoring docker metrics]
---

> Collect and monitor general performance Metrics of Docker containers.

## Pre-monitoring operations

If you want to monitor the container information in `Docker`, you need to open the port according to the following steps, so that the collection request can obtain the corresponding information.

**1. Edit the docker.server file:**

````shell
vi /usr/lib/systemd/system/docker.service
````

Find the **[Service]** node, modify the ExecStart property, and add `-H tcp://0.0.0.0:2375`

````shell
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock -H tcp://0.0.0.0:2375
````

This is equivalent to the **2375** port that is open to the outside world. Of course, it can be modified to other ports according to your own situation.

**2. Reload the Docker configuration to take effect:**

```shell
systemctl daemon-reload
systemctl restart docker
```

**Note: Remember to open the `2375` port number in the server console.**

**3. If the above method does not work:**

Open the `2375` port number inside the server.

```shell
firewall-cmd --zone=public --add-port=2375/tcp --permanent
firewall-cmd --reload
```

### Configuration parameters

|   Parameter name    |                                                                       Parameter help description                                                                       |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | Monitored peer IPV4, IPV6 or domain name. Note ⚠️ without protocol headers (eg: https://, http://).                                                                    |
| Monitor Name        | Identifies the name of this monitor. The name needs to be unique.                                                                                                      |
| Port                | The port provided by the database externally, the default is 2375.                                                                                                     |
| Query Timeout       | Set the timeout when getting the Docker server API interface, in ms, the default is 3000 ms.                                                                           |
| Container Name      | Generally monitors all running container information.                                                                                                                  |
| username            | connection username, optional                                                                                                                                          |
| password            | connection password, optional                                                                                                                                          |
| URL                 | Database connection URL, optional, if configured, the parameters such as database name, username and password in the URL will override the parameters configured above |
| Collection Interval | Monitor periodical collection data interval, in seconds, the minimum interval that can be set is 30 seconds                                                            |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring, and then continue to add and modify operations if the detection is successful     |
| Description Remarks | More remarks that identify and describe this monitoring, users can remark information here                                                                             |

### Collect metrics

#### Metric collection: system

|    Metric Name     | Metric Unit |              Metric Help Description               |
|--------------------|-------------|----------------------------------------------------|
| Name               | None        | Server Name                                        |
| version            | none        | docker version number                              |
| os                 | none        | server version eg: linux x86_64                    |
| root_dir           | none        | docker folder directory eg: /var/lib/docker        |
| containers         | None        | Total number of containers (running + not running) |
| containers_running | None        | Number of running containers                       |
| containers_paused  | none        | number of containers in pause                      |
| images             | None        | The total number of container images.              |
| ncpu               | none        | ncpu                                               |
| mem_total          | MB          | Total size of memory used                          |
| system_time        | none        | system time                                        |

#### Metric collection: containers

| Metric Name | Metric Unit |           Metric Help Description            |
|-------------|-------------|----------------------------------------------|
| id          | None        | The ID of the container in Docker            |
| name        | None        | The container name in the Docker container   |
| image       | None        | Image used by the Docker container           |
| command     | None        | Default startup command in Docker            |
| state       | None        | The running state of the container in Docker |
| status      | None        | Update time in Docker container              |

#### Metrics collection: stats

|   Metric Name    | Metric Unit |                  Metric Help Description                   |
|------------------|-------------|------------------------------------------------------------|
| name             | None        | The name in the Docker container                           |
| available_memory | MB          | The amount of memory that the Docker container can utilize |
| used_memory      | MB          | The amount of memory already used by the Docker container  |
| memory_usage     | None        | Memory usage of the Docker container                       |
| cpu_delta        | None        | The number of CPUs already used by the Docker container    |
| number_cpus      | None        | The number of CPUs that the Docker container can use       |
| cpu_usage        | None        | Docker container CPU usage                                 |
