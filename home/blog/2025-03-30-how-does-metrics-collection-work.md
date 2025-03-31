---
title: "Behind the Scenes of HertzBeat: How Metric Collection Works"
author: JuJinPark
author_title: JuJin
author_url: https://github.com/JuJinPark
tags: [opensource, practice]
keywords: [open source monitoring system]
---
## Behind the Scenes of HertzBeat: How Metric Collection Works

HertzBeat is an open-source, real-time monitoring system designed for flexibility and ease of use. But how exactly does it collect, process, and store metrics from various systems?

In this post, we’ll walk through the internal architecture behind **HertzBeat’s metric collection pipeline** — from job distribution to alerting and storage — with the help of a high-level system diagram.

---

### HertzBeat’s Metric Collection Architecture

![HertzBeat Architecture](/img/docs/hertzbeat-metrics-collection-arch.png)

> **Figure:** High-level architecture of HertzBeat's metric collection system. The Manager handles job scheduling, alerting, and storage, while Collectors (external or internal) perform the actual metric collection. Communication between the Manager and Collectors uses a custom Netty TCP protocol.

---

### 1. Job Distribution: Assigning What to Monitor

When the **Manager** component starts, it loads monitoring targets from the database. These targets define the host, collection interval, and other parameters.

To distribute the workload, the Manager sends jobs to **external Collectors** over a custom **Netty-based TCP protocol**. The `CollectJobScheduling` module handles this logic using **consistent hashing**, ensuring jobs are evenly distributed across collectors.

> 💡 HertzBeat also includes a built-in **main collector** (identified as `MAIN_COLLECTOR_NODE`) that runs directly inside the Manager. This allows HertzBeat to operate in **standalone mode** without requiring any external collectors.

---

### 2. Task Scheduling: When to Monitor

Once a Collector receives a job, it registers it with the **`TimerDispatch`** system.

- For **external collectors**, the Manager sends the task via the TCP connection.
- For the **main collector**, the Manager directly invokes `CollectJobService` within the same process.

Each Collector runs a **`Timer`** in a background thread, which schedules tasks according to their configured intervals. When the time is up, the timer triggers a `TimerTask` to begin metric collection.

---

### 3. Task Execution: How Metrics Are Collected

When a `TimerTask` is triggered, it creates a `MetricsCollect` task and passes it to `MetricsTaskDispatch`, which places it in the **`MetricsCollectorQueue`**.

- A dedicated thread (`CommonDispatcher`) continuously polls this queue.
- Tasks are executed by a **worker thread pool**, allowing multiple metric collections to run concurrently.
- Each task uses a specific **collector strategy** (e.g., HTTP, JDBC, SSH) to fetch metrics from the target system.

---

### 4. Result Processing: What Happens to Collected Data

Once metrics are collected, the results are processed by the **`CollectDataDispatch`** module.

- If the task is recurring, it is rescheduled via `TimerDispatch`.
- Results are added to a **`CommonDataQueue`** for further handling.

For external collectors, results are sent **back to the Manager** via the Netty TCP connection. For the main collector, results are forwarded **directly** to the next processing stage without network overhead.

---

### 5. Alerting & Storage: Making Metrics Useful

The Manager receives metric data and pushes it into the `MetricsDataToAlertQueue`, where it is processed through two main pipelines:

#### 🔔 Alerting

- The `RealTimeAlertCalculator` consumes metrics from the alert queue.
- It checks each metric against user-defined alert rules and triggers alerts if conditions are met.

#### 🧠 Storage

- After alert evaluation, metrics are added to the `MetricsDataToStorageQueue`.
- A background thread (`DataStorageDispatch`) processes this queue and stores the metrics in a database for long-term analysis and dashboard visualization.

---

### Standalone Mode: No External Collectors Required

Thanks to the built-in **main collector**, HertzBeat can operate entirely in standalone mode. This is especially useful for testing, small deployments, or quick setup. All core components — job scheduling, collection, alerting, and storage — run within a single process.

---

### 🧠 Conclusion

HertzBeat’s metric collection system is designed for **performance, scalability, and flexibility**. With its:

- **Queue-based, multi-threaded architecture**
- **Persistent TCP connections** for reliable job/result flow
- **Built-in main collector** for standalone operation

it handles large-scale monitoring workloads with minimal overhead and high efficiency.

---

### 🙌 What’s Next?

If you're curious to explore more:

- ⭐️ [Star the project on GitHub](https://github.com/apache/hertzbeat)
- 🤝 [Contribute or open an issue](https://github.com/apache/hertzbeat/issues)
