---
title: Welcome HertzBeat's New Community Committer!
author: Duansg
author_title: SiGuo Duan
author_url: https://github.com/Duansg
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

- **Name**: Siguo Duan
- **Github**: [Duansg](https://github.com/Duansg)
- **Email**: [duansg@apache.org](mailto:duansg@apache.org)
- **Position**: Senior Development Engineer
- **Primary Technical Focus**: Currently engaged in the e-commerce industry, primarily focused on the research and development of data processing and management for a billion-item product middle platform.

## First Encounter Apache HertzBeat

In practical projects, to enhance the existing monitoring system, we aim to implement visual monitoring and alerts for existing metrics. However, we also wish to avoid introducing or integrating overly complex monitoring systems. Consequently, I began searching for a monitoring solution that is ready-to-use, feature-rich, and easily extensible. It was during this process that I gradually encountered and became familiar with Apache HertzBeat.

Through continuous research and debugging, I began delving into its source code and gradually became involved in community contributions. Today, keeping up with community updates, reviewing pull requests, and discussing issues have become part of my daily routine.

## The Path to Open Source Contributions

The initial biggest challenge in formally contributing to the Apache HertzBeat project was unfamiliarity with its architecture, particularly the collaboration mechanisms between modules. By reading official documentation, source code, and historical PRs from the community, I gradually gained clarity on the project's structure. Simultaneously, discussions with community members during PR reviews provided invaluable advice and fresh perspectives—these exchanges fostered significant growth.

Through systematic reading of source code and analysis of historical changes, I gradually gained a deep understanding of the project structure and actively participated in code fixes and feature enhancements. To date, I have submitted and merged multiple contributions to the Apache HertzBeat project, including but not limited to:

> [47 commits](https://github.com/apache/hertzbeat/commits?author=Duansg)  23,649 ++  5,547 --

**Submitted PR (47 commits)**

- Fix:

  Prometheus real-time thresholds not taking effect issue([#3434](https://github.com/apache/hertzbeat/pull/3434))、null pointer exception in custom dashboards([#3448](https://github.com/apache/hertzbeat/pull/3448))、Jacoco test report generation failure([#3455](https://github.com/apache/hertzbeat/pull/3455))、
  Page count calculation error([#3467](https://github.com/apache/hertzbeat/pull/3467))、ANTLR4 semantic parsing fixes and optimizations([#3482](https://github.com/apache/hertzbeat/pull/3482)、[#3488](https://github.com/apache/hertzbeat/pull/3488))、collector startup notification exception([#3579](https://github.com/apache/hertzbeat/pull/3579))、
  Failure to send notifications when collector is offline([#3601](https://github.com/apache/hertzbeat/pull/3601))、JEXL keyword issue fixes and additions([#3629](https://github.com/apache/hertzbeat/pull/3629))、Security handling for JDBC URL([#3625](https://github.com/apache/hertzbeat/pull/3625))、
  Monitoring template fixes([#3636](https://github.com/apache/hertzbeat/pull/3636)、[#3649](https://github.com/apache/hertzbeat/pull/3649))、Server-chan whitelist optimization([#3740](https://github.com/apache/hertzbeat/pull/3740))、Grafana visualization integration display issues([#3666](https://github.com/apache/hertzbeat/pull/3666))

- Improvement:

  Prometheus parse([#3761](https://github.com/apache/hertzbeat/pull/3761)、[#3752](https://github.com/apache/hertzbeat/pull/3752)、[#3745](https://github.com/apache/hertzbeat/pull/3745)、[#3725](https://github.com/apache/hertzbeat/pull/3725)、[#3662](https://github.com/apache/hertzbeat/pull/3662))、Improved metric rendering performance[#3719](https://github.com/apache/hertzbeat/pull/3719)、
  Styling improvements([#3734](https://github.com/apache/hertzbeat/pull/3734))、SSE exception handling improvements([#3775](https://github.com/apache/hertzbeat/pull/3775))、Threshold rule operation enhancements([#3780](https://github.com/apache/hertzbeat/pull/3780))

- Refactor:

  Alert cache management([#3525](https://github.com/apache/hertzbeat/pull/3525))、PromQL threshold comparison logic([#3574](https://github.com/apache/hertzbeat/pull/3574))、Prometheus tag value UTF-8 support([#3810](https://github.com/apache/hertzbeat/pull/3810))

- New Features:

  PromQL threshold configuration preview([#3505](https://github.com/apache/hertzbeat/pull/3505))、System time zone feature([#3588](https://github.com/apache/hertzbeat/pull/3588))、Metric Favorites Feature([#3735](https://github.com/apache/hertzbeat/pull/3735))
  Jenkins Monitoring([#3774](https://github.com/apache/hertzbeat/pull/3774))、Apollo Configuration Center Monitoring([#3768](https://github.com/apache/hertzbeat/pull/3768))、TDengine monitoring([#3678](https://github.com/apache/hertzbeat/pull/3678))
  Huawei Cloud alert integration([#3443](https://github.com/apache/hertzbeat/pull/3443))、Alibaba Cloud SLS alert integration([#3422](https://github.com/apache/hertzbeat/pull/3422))、Metrics Parsing([#3645](https://github.com/apache/hertzbeat/pull/3645)、[#3612](https://github.com/apache/hertzbeat/pull/3612))
  Internationalization-Related([#3585](https://github.com/apache/hertzbeat/pull/3585)[#3565](https://github.com/apache/hertzbeat/pull/3565))

- Document:

  Document-related([#3383](https://github.com/apache/hertzbeat/pull/3383)、[#3380](https://github.com/apache/hertzbeat/pull/3380)、[#3526](https://github.com/apache/hertzbeat/pull/3526)、[#3559](https://github.com/apache/hertzbeat/pull/3559)、[#3600](https://github.com/apache/hertzbeat/pull/3600)、[#3658](https://github.com/apache/hertzbeat/pull/3658)、[#3695](https://github.com/apache/hertzbeat/pull/3695))

## Community Engagement and Growth

By participating in Apache HertzBeat's regular meetings and contributing daily, I not only broadened my technical horizons but also learned how to collaborate more effectively within open-source projects. Communicating and working alongside community members has given me a deeper appreciation for the open, inclusive, and supportive spirit of the open-source community.

Becoming a Committer means taking on greater responsibility. Beyond continuing to refine the code, it is even more crucial to maintain a rigorous approach during code reviews, providing contributors with constructive feedback and recognition to help more people participate and grow.

## Advice for Open Source Developers

The journey into open source begins with passion and grows through practice. Open source is not only a vehicle for technical enthusiasm but also a journey of mutual growth with the community.

For developers new to open source, taking the plunge is the most crucial step. Even the smallest contributions can accumulate into invaluable experience. In your daily work, actively participate in community discussions and code reviews, learning continuously through collaboration. Maintain patience and persistence—every challenge you encounter presents an opportunity for growth.

Within the Apache HertzBeat community, there are ample opportunities to actively participate in projects. Keep a close eye on the issue list and engage in frequent communication—you'll always find someone eager to respond to your ideas and gain inspiration from your perspectives. This is the very essence of community collaboration: a mutual journey forward.

## Contribute to Apache HertzBeat

The best time to plant a tree was ten years ago. The second-best time is now. If you'd like to contribute to Apache HertzBeat, you can start in the following ways:

1. Documentation and Translation: Improving or translating project documentation not only helps you quickly familiarize yourself with the project but also enables more users to understand it.
2. Issue Fixing: Browse project issues and attempt to claim and resolve some simple issues or optimization points.
3. Functional Expansion: Participate in discussions and development of new features based on interests and project requirements, gradually deepening understanding of the project architecture and refining functionality.

## Conclusion

We hope Apache HertzBeat will continue to uphold the spirit of open source, attracting more talented developers to jointly build a technologically advanced and vibrant community. I will also continue to contribute my efforts to Apache HertzBeat, and I look forward to welcoming more developers to join us in advancing the project's development.

A huge thank you to everyone in the community for your meticulous reviews and patient guidance on every PR. May the project's impact continue to grow, and may the community thrive!
