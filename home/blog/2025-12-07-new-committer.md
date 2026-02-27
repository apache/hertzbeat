---
title: Welcome HertzBeat's New Community Committer!
author: Delei
author_title: ZiQiu Guo
author_url: https://github.com/delei
tags: [opensource, practice]
keywords:
  [
    open source monitoring system,
    alerting system,
    Apache,
    Apache Committer,
    HertzBeat,
  ]
---

> Hello everyone, it's a great honor to be invited by the community to become Apache HertzBeat Committer.

## Self-Introduction

Since starting my career, I have mainly been engaged in backend development work and have a great interest in open-source projects. I am currently employed at a financial software company and also undertake the management work of operation and maintenance.

## First Encounter Apache HertzBeat

In our actual work, we have been using the monitoring system consisting of Prometheus and Grafana. As the number of devices and services to be monitored increased, and due to the limited number of operation and maintenance personnel, the workload for daily configuration and maintenance rose sharply, making it impossible for us to promptly handle and respond to user feedback.
At this point, we have been constantly looking for a lightweight open-source monitoring system. Apache HertzBeat is ready to use out of the box, has comprehensive functions, does not require an agent, is compatible with Prometheus, and fully covers all the protocols we currently use. Therefore, we quickly set it up and put it into use based on Docker internally.

As an open-source enthusiast myself, I encountered a few minor issues after using the software for some time. Since it happened to be written in a programming language I'm proficient in, I delved into the source code, endeavoured to refine the implementation, and contributed my improvements back to the community.

## The Path to Open Source Contributions

I initially began using the tagging feature, only to discover right away that tag maintenance had an NPE issue. So I delved into the source code and gained a preliminary understanding of the cause. Following the official documentation, I submitted [issue#3605](https://github.com/apache/hertzbeat/issues/3605) and created my first pull request to address it. Though a minor change, it was merged promptly, which proved immensely encouraging.

During subsequent, more in-depth usage, based on the actual monitored devices and scenarios, I primarily added several new monitoring services, such as [Apache DolphinScheduler](https://github.com/apache/hertzbeat/pull/3656), [MacOS](https://github.com/apache/hertzbeat/pull/3715), [Synology NAS](https://github.com/apache/hertzbeat/pull/3721), amongst others. Collaborating with other community contributors, I refined and resolved the `jexl` keyword issue while also enhancing the status page functionality.

## Community Engagement and Growth

Through daily contributions to Apache HertzBeat, I have also learnt how to collaborate more effectively within open-source projects. Communicating and working alongside community members has given me a deeper appreciation for the unique appeal of the ‘Apache Way’ and the spirit of open-source.

Becoming a Committer entails greater responsibility. Beyond continuing to contribute, it is vital to maintain a rigorous approach, offering constructive feedback and recognition to contributors, thereby helping more individuals participate in the community and grow within it.

## Advice for Open Source Developers

For developers who are new to open source, first of all, please be brave to try and let go of your worries to take the first step. The process of making contributions requires time, but as long as you have patience, you will achieve results.

In the Apache HertzBeat community, by communicating more, many enthusiastic and friendly open-source contributors in the community can collaborate together. We can first gradually use and experience the functions, and start to attempt to contribute. For example, small contributions such as correcting spelling errors in the documentation and fixing incorrect comments, and then gradually deepen our understanding of the source code and try to fix the problems.

## Conclusion

My heartfelt thanks to all community partners for your patient reviews and thoughtful guidance. It has been a tremendous privilege to witness Apache HertzBeat successfully graduate to a TLP project during this period.

Becoming a Committer marks merely a small milestone for me. I look forward to continuing to uphold the spirit of open source alongside Apache HertzBeat, attracting more outstanding developers to jointly build a technologically advanced and vibrant community.
