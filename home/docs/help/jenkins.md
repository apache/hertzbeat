---
id: jenkins
title: Monitoring Jenkins
sidebar_label: Jenkins
keywords: [ open-source, monitoring system, CI/CD, DevOps, Jenkins monitoring ]
---

> Monitoring of Jenkins' general metrics is performed by invoking the Jenkins Prometheus Plugin.

### Prerequisites

1. Set up Jenkins-related services according to
   the [deployment documentation](https://www.jenkins.io/doc/book/installing/).
2. Requires installation of the [plugin](https://www.jenkins.io/doc/book/managing/plugins/) Exposed metric information
   has been accessed; refer to the [prometheus-plugin](https://plugins.jenkins.io/prometheus/) for details.
3. The externally exposed metrics endpoint is ```<jenkin_url>/prometheus```. Verify whether you can access the metrics
   data.

### Configuration parameters

| Parameter Name    | Parameter Help Description                                                                                            |
|-------------------|-----------------------------------------------------------------------------------------------------------------------|
| Target Host       | The monitored peer's IPv4, IPv6, or domain name. Note⚠️: Do not include protocol headers (e.g., https://, http://).   |
| Port              | Jenkins port value, default is 8080.                                                                                  |
| Task Name         | The name identifying this monitoring task. The name must be unique.                                                   |
| Query Timeout     | Set the connection timeout in milliseconds (ms). Default is 3000 ms.                                                  |
| Monitoring Cycle  | The interval time for periodic data collection, measured in seconds. The minimum configurable interval is 30 seconds. |
| Binding Tags      | Used for classifying and managing monitored resources                                                                 |
| Description Notes | Additional identifiers and descriptive notes for this monitoring task. Users can add notes here.                      |

### Collection indicators

#### Indicator Set: System Information Indicators

| Indicator name               | Unit        | Metric Help Description     |
|------------------------------|-------------|-----------------------------|
| default_jenkins_uptime       | millisecond | Jenkins runtime             |
| default_jenkins_up           | None        | Jenkins still running       |
| default_jenkins_version_info | None        | Jenkins Version Information |
| jenkins_health_check_score   | None        | Jenkins Health Check Score  |

#### Metric Set: jvm

| Indicator name         | Unit        | Metric Help Description                   |
|------------------------|-------------|-------------------------------------------|
| vm_uptime_milliseconds | millisecond | JVM runtime                               |
| system_cpu_load        | None        | System Load                               |
| vm_count               | None        | Total Number of JVM Threads               |
| vm_memory_heap_max     | MB          | Maximum memory limit available to the JVM |
| vm_memory_heap_used    | MB          | Current memory usage of the JVM           |

#### Indicator set: Basic information indicators

| Indicator name                      | Unit | Metric Help Description                |
|-------------------------------------|------|----------------------------------------|
| jenkins_project_count_value         | None | Number of projects                     |
| jenkins_project_enabled_count_value | None | Number of enabled items                |
| jenkins_queue_size_value            | None | Number of tasks in the build queue     |
| jenkins_node_online_value           | None | Number of currently online build nodes |

#### Indicator Set: Actuator Information Indicators

| Indicator name                       | Unit | Metric Help Description                 |
|--------------------------------------|------|-----------------------------------------|
| default_jenkins_executors_available  | None | Number of available actuators           |
| default_jenkins_executors_busy       | None | Number of active actuators              |
| default_jenkins_executors_connecting | None | Number of actuators currently connected |

#### Indicator Set: Task Information Indicators

| Indicator name                                           | Unit                                                     | Metric Help Description                           |
|----------------------------------------------------------|----------------------------------------------------------|---------------------------------------------------|
| jenkins_job_count_value                                  | None                                                     | Number of assignments                             |
| default_jenkins_builds_duration_milliseconds_summary_sum | millisecond                                              | Task Construction Duration Summary                |
| default_jenkins_builds_last_build_duration_milliseconds  | millisecond                                              | Time of the most recent build                     |
| default_jenkins_builds_success_build_count_total         | None                                                     | Number of successful builds                       |
| default_jenkins_builds_failed_build_count_total          | None                                                     | Number of build failures                          |
| default_jenkins_builds_unstable_build_count_total        | None                                                     | Number of unstable builds                         |
| default_jenkins_builds_total_build_count_total           | None                                                     | Total number of builds (excluding unbuilt states) |
| default_jenkins_builds_last_build_result_ordinal         | 0=Success, 1=Unstable, 2=Failure, 3=Not Built, 4=Aborted | Task Build Status (Last Build)                    |
