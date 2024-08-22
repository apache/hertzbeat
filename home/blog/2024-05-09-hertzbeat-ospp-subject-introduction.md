# [Open Source Summer] Hertzbeat project introduction

## What is HertzBeat?

HertzBeat is a powerful custom monitoring capabilities, high-performance cluster, compatible with Prometheus, agentless open source real-time monitoring alarm system.

### **Features**

- Set **monitoring + alarm + notification** as a whole, support for application services, applications, database, cache, operating system, big data, middleware, Web server, cloud native, network, custom and other monitoring threshold alarm notification in one step.
- Easy to use and friendly, no `Agent`, full `WEB` page operation, a mouse click can monitor alarms, zero hand learning costs.
- Protocol specifications such as Http, Jmx, Ssh, Snmp, Jdbc, Prometheus, etc. can be configured, and the monitoring template YML can be configured in the browser to use these protocols to customize the desired metrics. Do you believe that you can immediately adapt a new monitoring type such as`K8s` or `Docker` just by configuring it?
- Compatible with Prometheus` ecosystem and more, only page operations can monitor what Prometheus can monitor.
- High-performance, supports horizontal expansion of multiple collector clusters, supports multi-isolated network monitoring, and cloud edge collaboration.
- Free alarm threshold rules, `mail,` `Discord,` `Slack,` `Telegram,` `Dingding,` `wechat,` `Feibook,` `SMS,` `Webhook,` `Server sauce,` and other ways to send messages in a timely manner.

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

## What is Open Source Summer?

Open Source Summer is a summer open source activity initiated and long-term supported by the "Open Source Software Supply Chain Lighting Program" of the Institute of Software of the Chinese Academy of Sciences, aiming to encourage the development of open source

School students actively participate in the development and maintenance of open source software, cultivate and discover more excellent developers, promote the vigorous development of excellent open source software community, and help open

Source software supply chain construction.

Open Source Summer The Open source community within and outside the United Nations provides project tasks for the development and maintenance of important open source software, open to university students around the world

Selected students will participate in open source contributions, complete development work and contribute to the open source community under the guidance of senior project developers (project mentors)

**Event Rules**

Open Source Summer Website:

[*https://summer-ospp.ac.cn/*](https://summer-ospp.ac.cn/)

Students are free to choose the project, communicate with the community mentor to realize the plan and write the project plan. The selected students will complete the development work as planned under the guidance of community mentors and contribute the results to the community. The community evaluates the student`s completion, and the sponsor distributes the financial aid to the student based on the evaluation results.

## HertzBeat project

### 1、 the realization of monitoring template market store

**Project difficulty: Advanced /Advanced**

**Background:** Because `HertzBeat` is a highly customized monitoring system through yml files, we can configure the relevant yml files to do so
Capture the metrics we want to monitor. Some different users may have different requirements for some middleware data indicators, `HertzBeat` official come with
the yml configuration may not satisfy every user, so our goal is to let users contribute their own yml template to benefit more people.
This can not only make the ecology of `HertzBeat` more perfect, but also make the user experience better!

**Requirements:**

1. Use Java17, springboot3 to write the back-end code, Angular(recommended) or Vue to write the front-end code.
2. Search, download, and share yml template files (no login required).
3. The template page displays the number of downloads, categories, template description, and (optional) template versions.
4. Realize user personal page registration, login (later), upload template.

**Output:**

1. Feature code can be incorporated into the HertzBeat repository as PR.
2. Complete the HertzBeat official template market
3. Update the help documents

**Contact Tutor:** Qingran Zhao [zqr10159@dromara.org](mailto:zqr10159@dromara.org)

### 2、 implementation of Java native ipmi2 communication protocol

**Project difficulty: Advanced /Advanced**

**Background:** `HertzBeat` supports multiple monitoring protocols, such as http, jmx, jdbc, and snmp. By encapsulating these protocols can be implemented against various
middleware monitoring without Agent. In order for HertzBeat to have a wider monitoring area, we intend to be based on the Java language and not rely on third parties
package, the implementation of the native IPMI2 protocol in the query part, and use the protocol to obtain server motherboard information, network card information, power supply information, fan information,
temperature sensor information and clock information.

**Requirements:**

1. Use Java to implement the native IPMI2 protocol (query part) based on the UDP protocol, without relying on any third-party package.
2. Use the implemented IPMI2 protocol to query indicators of the IPMI enabled server, including mainboard information, network adapter information, power supply information, and fan information
   alarm, temperature sensor information and clock information.
3. Abstract and standardize the queried indicator information to implement configuration management (optional).
4. Output detailed project documents, including design ideas, implementation details, usage instructions, etc.

**Output:**

- Feature code can be incorporated into the HertzBeat repository as PR.

- Complete the encapsulation of native IPMI2 protocol in Java based on UDP protocol and monitor the corresponding server.

- You can configure YML files to highly customize monitoring indicators (optional).

- Improve help documentation.

**Contact Tutor:** Tiejia Xiaobao [tjxiaobao2024@qq.com](mailto:tjxiaobao2024@qq.com)

## What can you gain by participating in HertzBeat?

Some of you may wonder what can be gained by participating in Open Source Summer?

1. **【Your code is widely reused by the society】Your code may run in the core business logic of tens of thousands of enterprises to help enterprises solve problems.**
2. **【 Win the maximum 12000 bonus 】 The total bonus is divided into advanced 12000 Yuan and basic 8000 Yuan according to the difficulty of the project (Note: the bonus amount is RMB before tax)**
3. **【 Community core staff counseling rapid growth 】 As long as you sign up and are selected, the tutor of each topic will carefully teach you to integrate into the community, and help you complete the design of the topic and the final landing.**
4. **【Recommended Entry/Internship】 Students with excellent performance in this Programming Summer project can be recommended to work in your preferred company.**
5. **【Additional community surprise】 All students participating in this Summer of Programming project have the opportunity to become Apache HertzBeat committer and have their own apache email.**

**There are 100% prizes to take oh**, now the only problem is that time is running out, hurry up to sign up! The deadline for registration is June 4, so hurry up and sign up for 2023 Summer of Programming.
