# Apache HertzBeat Graduates as an Apache Top-Level Project!

> ——A Milestone Moment for the Open-Source Real-Time Monitoring System
>
> On August 21, 2025 (Beijing Time), the Apache Software Foundation (ASF), the world's largest open-source software foundation, officially announced that Apache HertzBeat has graduated to become an Apache Top-Level Project (TLP).
>
> Apache HertzBeat applied to join the Apache Incubator in March 2024. In less than 2 months, it was officially accepted as an Apache Incubator project with an **unanimous vote** due to its outstanding performance. On August 21, 2025, the Apache Board of Directors approved HertzBeat's graduation resolution, concluding its 17-month incubation period and formally confirming Apache HertzBeat as an Apache Top-Level Project.
>
> This achievement signifies that Apache HertzBeat has fully met the strict standards of the Apache Foundation in terms of technological innovation, community governance, and ecological maturity in the monitoring field, making it a key choice for global open-source monitoring infrastructure.


## 1. What is Apache HertzBeat?

[Apache HertzBeat](https://github.com/apache/hertzbeat) is an easy-to-use and user-friendly open-source real-time monitoring and alerting system. It requires no Agent, supports high-performance clustering, is compatible with Prometheus, and provides powerful capabilities for custom monitoring and status page building.

![hertzBeat](https://gitee.com/hertzbeat/hertzbeat/raw/master/home/static/img/docs/hertzbeat-arch.png)

### Features

- Integrates **monitoring + alerting + notification** in one. It supports one-stop monitoring, threshold alerting, and notification for application services, applications, databases, caches, operating systems, big data platforms, middleware, web servers, cloud-native technologies, networks, and custom targets.
- Easy to use and user-friendly: No `Agent` required, full `WEB` page operation. Monitoring and alerting can be set up with just a few clicks, with no learning curve.
- Configurable protocol specifications such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`. You only need to configure a monitoring template `YML` in the browser to use these protocols for custom collection of desired metrics. Can you believe that you can quickly adapt to a new monitoring type like `K8s` or `Docker` with simple configurations?
- Compatible with and extends the Prometheus ecosystem. You can monitor everything that Prometheus can monitor through simple page operations.
- High performance: Supports horizontal scaling of multi-collector clusters, multi-isolated network monitoring, and cloud-edge collaboration.
- Flexible alert threshold rules, with timely notifications via `Email`, `Discord`, `Slack`, `Telegram`, `DingTalk`, `WeChat`, `Feishu`, `SMS`, `Webhook`, `ServerChan`, etc.
- Provides powerful status page building capabilities to easily convey the real-time status of your product services to users.


## 2. Incubation Journey and Community Achievements

### I. Incubation Journey

- **March 2024**:
  HertzBeat officially applied to join the Apache Incubator. With its innovative agentless monitoring architecture and active community performance, it was accepted as an Apache Incubator project with **unanimous approval in less than 2 months**.

- **August 21, 2025**:
  After **17 months of efficient incubation**, the Apache Board of Directors approved HertzBeat's graduation resolution, formally promoting it to an Apache Top-Level Project (TLP).

During the incubation period, under the guidance of the Apache Foundation Incubator, HertzBeat completed three major transformations:

- **Structured Governance**: Established an open governance model led by the PMC (Project Management Committee), with community decisions conducted publicly via mailing lists.
- **Standardized Processes**: Adopted Apache release processes, with all versions approved by IPMC (Incubator Project Management Committee) votes.
- **Global Collaboration**: Attracted developers and users from around the world to contribute to Apache HertzBeat.

### II. Technical Milestones

During the incubation period, HertzBeat maintained an active R&D and iteration rhythm, with multiple versions released successively to bring users richer features, more stable performance, and a better user experience.

- Released 4 ASF-compliant versions (1.6.0 - 1.7.2)
- Key Feature Breakthroughs:
  - **Multi-Protocol Monitoring Expansion** - Added support for key protocols such as HBase, InfluxDB, NebulaGraph, and Redfish.
  - **Intelligent Alert System** - Implemented multi-expression alerts, periodic thresholds, and alert suppression/silencing functions.
  - **Dynamic Service Discovery** - Achieved automatic task discovery through http_sd and Zookeeper/Nacos.
  - **Cloud Service Integration** - Supported connection to alert sources of Alibaba Cloud SLS, Huawei Cloud, and Volcano Engine.
  - **AI Capability Enhancement** - Integrated Ollama and OpenRouter AI platforms.
  - **Storage Optimization** - Upgraded storage performance of VictoriaMetrics and GreptimeDB.
  - **Internationalization Support** - Added multi-language interfaces including Japanese and Traditional Chinese.
  - **Data Processing Enhancement** - Supported SQL/PromQL expression syntax analysis.

The continuous iteration of these versions fully demonstrates HertzBeat's dedication to technological advancement and high attention to user needs. Each version release is a solid step in HertzBeat's growth, bringing users a more powerful and easy-to-use monitoring experience.

### III. Community Development

During the Apache incubation period, HertzBeat strictly practiced the Apache Way:

- **Equal Contribution and Authority Accumulation**: All developers participate on an equal basis. Through code contributions, documentation improvement, and problem-solving, they gradually gain recognition and access rights such as direct code repository submission permissions, motivating developers' enthusiasm.
- **Flat Architecture for Efficient Collaboration**: Adopts a flat organizational structure with no hierarchical distinctions among members. Everyone communicates equally and makes joint decisions. For example, when discussing the implementation of new features, members can quickly reach a consensus to accelerate project progress.
- **Open and Transparent Communication**: Publicly discusses technical selection, version planning, etc., via mailing lists, with all communication records archived and accessible. Members can participate at any time and from anywhere, and new members can also quickly integrate by learning historical communication records.
- **Consensus-Driven Decision-Making**: When facing key decisions such as adding/removing features or selecting technical routes, the community conducts in-depth discussions and weighs factors from multiple aspects. If full consensus cannot be reached, voting is used to assist in decision-making, ensuring the project direction aligns with the overall interests of the community.
- **Community-First Philosophy**: Values community building. Through organizing technical sharing sessions and assigning mentors to new members, it enhances community cohesion and attracts more developers to provide impetus for project innovation.

- **Contributor Growth**:
  - During the incubation period, **13 new Committers** were added, including **3 nominated PPMC (Project Management Committee) members**, with contributors reaching 275. Meanwhile, the core team covers multiple time zones across China, the United States, and Europe.
  - GitHub **Stars exceeded 6K+**, with an average of **30+ daily active developers**.

- **User Cases**:
  - **Application Fields**: Since incubation, Apache HertzBeat has been successfully implemented in various industry scenarios due to its lightweight, agentless, and highly scalable features, becoming a new choice for enterprise monitoring infrastructure.
  - **Cloud Service Providers**: It has been integrated as a core monitoring component into the private cloud platforms of multiple cloud service providers, providing users with a unified, lightweight monitoring view from infrastructure to application services, replacing traditional monitoring suites that are complex to deploy and consume high resources.
  - **Developer Ecosystem**: The community has contributed a large number of monitoring templates covering mainstream technology stacks such as Kubernetes, Docker, Redis, and MySQL, greatly reducing the cost of monitoring configuration.


## 3. Future Outlook and Plans

Becoming an Apache Top-Level Project is a milestone and even a new starting point. The Apache HertzBeat community will continue to uphold the Apache Foundation's concept of "Community Over Code" and continue to evolve around the following core directions, striving to become a world-leading open-source observability platform:

1. Enhance Product Performance and Scalability
   - Continuously optimize collection scheduling algorithms and cluster architecture to support larger-scale monitoring scenarios.
   - Improve system stability, reduce resource consumption, and enhance data processing efficiency.

2. Improve Features and User Experience
   - Simplify the monitoring configuration process and provide a more intuitive and easy-to-use operation interface.
   - Enhance status page functions and support more customization options.

3. Strengthen Community Building and Internationalization
   - Expand the community scale and attract more contributors to participate in project development.
   - Improve multi-language support, including document internationalization and interface localization.


## 4. Acknowledgments

The successful graduation of Apache HertzBeat from the incubator would not have been possible without the joint efforts of all community members and supporters. Here, we would like to express our sincere gratitude to:

- **Apache Foundation & Incubator**
  Thank you to the Apache Foundation for providing a neutral collaboration platform and a sound incubation process, as well as the help from incubator members in project governance, version release, and community building.

- **Sincere Thanks to Apache Mentors for Their Selfless Dedication and Guidance**
  Thank you to all mentors (a tribute to mentors such as **Yonglun Zhang**, **Yu Xiao**, **Justin Mclean**, and **Francis Chuang**) for their valuable suggestions, architecture reviews, and community governance guidance during the incubation process. Your professional experience and selfless help have guided the project in the correct direction in line with the Apache Way.

- **Sincere Thanks to All Code Contributors, Documentation Maintainers, and Community Participants**
  Thank you to hundreds of contributors around the world for their wisdom and efforts. Whether it is code submissions, issue feedback, document translation, or community discussions, every effort you make is an important driving force for the project's progress.

- **Special Tribute to Core Contributors and Project Management Committee Members**
  Thank you for your long-term persistence and dedication, which have played a key role in the evolution of the technical architecture, the establishment of community norms, and project promotion.

- **Thank You to All Users and Adopting Organizations for Their Trust and Support**
  Thank you for your practical verification in the production environment and continuous feedback. These valuable experiences have greatly promoted the maturity and improvement of the product.

Finally, we have always believed that: **Communities Achieve Greatness**. Tribute to open source, and tribute to every participant!

We welcome more developers to join us and jointly build a more outstanding monitoring ecosystem!

—— The Apache HertzBeat Community