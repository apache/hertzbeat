---
title: Apache HertzBeat Graduates as an Apache Top-Level Project!
author: TJxiaobao
author_url: https://github.com/TJxiaobao
tags: [opensource, apache]
---

> **A Milestone Moment for Our Open-Source Project**
>
> On August 21, 2025, the Apache Software Foundation (ASF), the world's largest open-source software foundation, officially announced that Apache HertzBeat has graduated to become an Apache Top-Level Project (TLP).
>
> Apache HertzBeat applied to join the Apache Incubator in April 2024 and released its first Apache version two months later. On August 21, 2025, the Apache Board of Directors approved the resolution for Apache HertzBeat's graduation, ending a 17-month incubation period and officially establishing Apache HertzBeat as an Apache Top-Level Project.
>
> This achievement signifies that Apache HertzBeat's technological innovation, community governance, and ecosystem maturity in the monitoring field have fully met the stringent standards of the Apache Foundation, making it a key choice for global open-source monitoring infrastructure.

## 1. What is Apache HertzBeat?

[Apache HertzBeat](https://github.com/apache/hertzbeat) is an easy-to-use, open-source, real-time monitoring and alerting system that requires no agent, features a high-performance cluster, is compatible with Prometheus, and offers powerful custom monitoring and status page building capabilities.

![hertzBeat](/img/docs/hertzbeat-arch.png)

### Features

- **All-in-one monitoring, alerting, and notification**, supporting one-stop monitoring, threshold alerting, and notifications for application services, applications, databases, caches, operating systems, big data, middleware, web servers, cloud-native, network, custom, and more.
- **User-friendly and easy to use**, requiring no `Agent`. All operations are done through a `WEB` interface, allowing you to set up monitoring and alerts with just a few clicks, with no learning curve.
- **Configurable protocol specifications** such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`. You only need to configure a monitoring template `YML` in your browser to use these protocols to collect any desired metrics. Can you believe that you can quickly adapt to a new monitoring type like `K8s` or `Docker` with just a simple configuration?
- **Compatible with the `Prometheus` ecosystem and more**, allowing you to monitor everything that Prometheus can with simple page operations.
- **High performance**, supporting horizontal scaling of multi-collector clusters, multi-isolated network monitoring, and cloud-edge collaboration.
- **Flexible alert threshold rules**, with timely notifications via `Email`, `Discord`, `Slack`, `Telegram`, `DingTalk`, `WeChat`, `Feishu`, `SMS`, `Webhook`, `ServerChan`, and other methods.
- **Powerful status page building capabilities**, making it easy to convey the real-time status of your product services to users.

## 2. Incubation Journey and Milestones

#### **I. Incubation Journey**

- **April 2024**:
  HertzBeat officially applied to join the Apache Incubator and became an Apache Incubator project.

- **June 2024**:
  The first Apache version was released, marking the project's official entry into the Apache ecosystem. (During this period, a large number of non-compliant third-party dependencies were replaced, such as the database JPA specification implementation being replaced from Hibernate to EclipseLink).

- **August 21, 2025**:
  After **17 months of efficient incubation**, the Apache Board of Directors passed the resolution for HertzBeat's graduation, officially promoting it to an Apache Top-Level Project (TLP).

Under the guidance of the Apache Foundation Incubator, three major transformations were completed:

- **Structured Governance:** Established a PMC-led open governance model, with community decisions made publicly through mailing lists.
- **Standardized Processes:** Adopted the Apache release process, with all versions approved by IPMC vote.
- **Global Collaboration:** Attracted developers and users from all over the world to contribute to Apache HertzBeat.

#### **II. Technical Milestones**

During the incubation period, Hertzbeat maintained an active pace of research, development, and iteration, releasing multiple versions to bring users richer features, more stable performance, and a better experience.

- Released 5 ASF-compliant versions (1.6.0 - 1.7.2)
- Key feature enhancements include:
    - **Multi-protocol expansion** - Added support for key components or protocols such as Ipmi, PLC, NVIDIA, Redfish.
    - **Intelligent alert center** - Implemented multi-expression alerts, periodic thresholds, and alert suppression/silencing/dispatch functions.
    - **Dynamic service discovery** - Achieved automatic task discovery through http_sd and Zookeeper/Nacos.
    - **Cloud service integration** - Supported integration with alert sources from Alibaba Cloud SLS, Huawei Cloud, and Volcano Engine.
    - **AI capability enhancement** - Integrated AI platforms such as OpenAI.
    - **Storage optimization** - Upgraded storage performance for VictoriaMetrics and GreptimeDB.
    - **Internationalization support** - Added multi-language interfaces, including Japanese/Traditional Chinese.
    - **Data processing enhancement** - Supported SQL/PromQL expression syntax analysis, refactoring data flow with Apache Arrow.

The continuous iteration of these versions fully demonstrates Hertzbeat's dedication to technology and its high regard for user needs. Each version release is a solid step in Hertzbeat's growth, bringing users a more powerful and user-friendly monitoring experience.

#### **3. Community Development**

During the Apache incubation period, Hertzbeat strictly adhered to the Apache Way:

- **Equal contribution and authority accumulation**: All developers participate equally, gradually building a reputation and gaining access, such as code repository submission rights, through code contributions, documentation improvements, and issue resolution.
- **Open and transparent communication**: Technical selections, version planning, and other discussions are conducted openly via mailing lists, with communication records archived and searchable. Members can participate anytime, anywhere, and new members can quickly integrate by reviewing these records.
- **Consensus-driven decision-making**: For key decisions such as adding or removing features and choosing technical routes, the community engages in thorough discussions, weighing various factors. If a complete consensus cannot be reached, voting is used to assist, ensuring that the project's direction aligns with the overall interests of the community.

- **Contributor Growth**:
    - During the incubation period, **13 new Committers** were added, including **3 nominated PPMC members**, and the number of contributors reached 275. The core team also covers multiple time zones in China, the US, and Europe.
    - GitHub **Stars surpassed 6K+**, with an average of **30+** monthly active developers.
- **User Ecosystem**:
    - **Application Areas**: Since its incubation, Apache HertzBeat has been successfully implemented in various industry scenarios due to its lightweight, agentless, and highly scalable features, becoming a new choice for enterprise monitoring infrastructure.
    - **Developer Ecosystem**: The community has contributed a large number of monitoring templates covering mainstream technology stacks such as Kubernetes, Docker, Redis, and MySQL, significantly reducing the cost of monitoring configuration.

## 3. Future Outlook and Plans

Becoming an Apache Top-Level Project is a milestone, but it is also a new beginning. The Apache HertzBeat community will continue to uphold the Apache Foundation's "community over code" philosophy and evolve around the following core directions, striving to become a world-leading open-source observability platform:

1. AI and Intelligent Capabilities
- Explore the application of AI in monitoring data analysis, anomaly detection, and intelligent alerting.
- Integrate more AI models and services to enhance the user experience.

2. Enhance Product Performance and Scalability
- Continuously optimize collection scheduling algorithms and cluster architecture to support larger-scale monitoring scenarios.
- Improve system stability, reduce resource consumption, and enhance data processing efficiency.

3. Improve Functionality and User Experience
- Simplify the monitoring configuration process and provide a more intuitive and user-friendly interface.
- Enhance the status page functionality and support more customization options.

4. Strengthen Community Building and Internationalization
- Expand the community size and attract more contributors to participate in project development.
- Improve multi-language support, including document internationalization and interface localization.

## 4. Acknowledgments

The successful graduation of Apache HertzBeat from the incubator would not have been possible without the collective efforts of all community members and supporters. We would like to express our sincerest gratitude to:

- **The Apache Foundation & Incubator**
  Thank you to the Apache Foundation for providing a neutral collaboration platform, a comprehensive incubation process, and the help of incubator members in project governance, version releases, and community building.

- **Sincere thanks to our Apache mentors for their selfless dedication and guidance**
  Thank you to our mentors (a tribute to the guidance of mentors such as **Yonglun Zhang**, **Yu Xiao**, **Justin Mclean**, and **Francis Chuang**) for their valuable advice, architectural reviews, and community governance guidance during the incubation process. Your professional experience and selfless help have guided the project in the right direction, in line with the Apache Way.

- **Sincere thanks to all code contributors, documentation maintainers, and community participants**
  Thank you to the hundreds of contributors worldwide for their wisdom and efforts. Whether it's code submissions, issue feedback, document translation, or community discussions, your every effort is a vital driving force for the project's progress.

- **A special tribute to the core contributors and Project Management Committee members**
  Thank you for your long-term persistence and dedication, which have played a key role in the evolution of the technical architecture, the establishment of community norms, and project promotion.

- **Thank you to all users and adopting organizations for their trust and support**
  Thank you for your practical validation and continuous feedback in production environments. These valuable experiences have greatly promoted the maturity and improvement of the product.

Finally, we have always believed that: **Community Achieves Greatness**. A tribute to open source, a tribute to every participant, and may our code run on machines worldwide!

We welcome more developers to join us and have fun!

—— The Apache HertzBeat Community
