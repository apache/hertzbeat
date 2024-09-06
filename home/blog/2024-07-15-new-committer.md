---
title: Welcome to HertzBeat Community Committer!
author: LiuTianyou
author_title: LiuTianyou
author_url: https://github.com/LiuTianyou
author_image_url: https://avatars.githubusercontent.com/u/30208283?v=4
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

![HertzBeat](/img/blog/new-committer.png)

Hello everyone, I am very honored to receive an invitation from the community to be nominated as a Committer for Apache HertzBeat. Let me introduce myself briefly. I have been working as a backend developer since 2019, mainly using Java. Currently, I am working at a network security company, focusing on the backend development of network security-related products.

### Encounter

In my work, several physical servers are deployed, running various databases and middleware. Although we have deployed the Prometheus + Grafana monitoring combination, most services and servers require additional installation of exporters.  
As a result, this monitoring system does not cover the entire project. Sometimes, we only realize a service is down when it is too late. One day in April, I came across an article introducing HertzBeat. I was immediately attracted by its unique features, such as no need for agents and fully visualized configuration, along with support for one-click deployment via Docker. I quickly deployed HertzBeat and put it into use.

### Familiarization

Due to the fully visualized operation, I quickly incorporated the servers, databases, and middleware used in the project into HertzBeat's management. Afterwards, the community was preparing to release the first Apache version and needed to supplement a large amount of documentation. I attempted to submit some documents to familiarize myself with the community's process for submitting code and documentation, and at the same time, I got familiar with the relevant parts of the code while supplementing the documents.

### Trying to Add Something

The first major change I made was to enable HertzBeat to support querying metrics from NebulaGraph using NGQL statements. Additionally, I added a monitoring template for NebulaGraph clusters based on this protocol. The idea initially came from my own needs. When I submitted this idea to the community, I quickly received a response and affirmation from the community, which greatly increased my confidence in continuously participating in this project.

### Joining

Due to my continuous writing of documents and contributing code, I started to become familiar with this community and this project, and began to make some of my own suggestions. Many of these suggestions were adopted by the community and released in new versions. After the first Apache version was released, I received an invitation from @tomsun28 and @TJxiaobao to be nominated as a Committer.

### Conclusion

I am very honored to be able to participate in this project and be recognized by the community. I would like to thank @tomsun28, @TJxiaobao, @zqr10159, @tuohai666, @yuluo-yx, @crossoverJie, @zhangshenghang, and @pwallk for reviewing my code, providing guidance, and helping me. Finally, I wish Apache HertzBeat to grow strong and have more and more contributors participating.
