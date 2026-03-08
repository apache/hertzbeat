import React from 'react';
import Layout from '@theme/Layout';
import FAQSchema from '../../components/FAQSchema';
import styles from '../styles.module.css';

const faqs = [
  {
    question: "什么是 Apache HertzBeat？",
    answer: "Apache HertzBeat 是一款 AI 驱动的无代理开源实时监控系统。它统一了指标收集、日志聚合、告警分发和通知功能，无需安装代理即可运行。"
  },
  {
    question: "HertzBeat 需要安装代理吗？",
    answer: "不需要。HertzBeat 使用无代理监控，通过原生协议（HTTP、SNMP、JMX、SSH、JDBC）收集数据。只需在 Web 界面提供 IP、端口和凭据。"
  },
  {
    question: "如何安装 HertzBeat？",
    answer: "运行单个 Docker 命令：docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat。然后访问 http://localhost:1157，默认账号：admin/hertzbeat。"
  },
  {
    question: "HertzBeat 可以监控哪些系统？",
    answer: "HertzBeat 监控 200+ 服务，包括数据库（MySQL、PostgreSQL、MongoDB、Redis、Oracle、SQL Server）、操作系统（Linux、Windows、Unix）、中间件（Tomcat、Kafka、Zookeeper、RabbitMQ、Nginx）、云原生（Kubernetes、Docker）、网络（思科、华为、HPE 交换机）。"
  },
  {
    question: "可以创建自定义监控模板吗？",
    answer: "可以。通过 Web UI 创建 YML 模板监控任何服务。模板定义指标、收集协议和阈值，无需编码。"
  },
  {
    question: "HertzBeat 兼容 Prometheus 吗？",
    answer: "兼容。HertzBeat 支持 Prometheus 协议，可从 Prometheus 导出器收集指标。"
  },
  {
    question: "HertzBeat 与 Prometheus + Grafana 相比如何？",
    answer: "HertzBeat 提供统一平台，包含收集、告警和通知。Prometheus + Grafana 需要独立的告警组件（Alertmanager），且缺乏内置的多渠道通知。"
  },
  {
    question: "支持哪些通知渠道？",
    answer: "邮件、Discord、Slack、Telegram、钉钉、微信、飞书、短信、Webhook。"
  },
  {
    question: "HertzBeat 能否大规模部署？",
    answer: "可以。部署采集器集群实现水平扩展。采集器自动负载均衡任务并提供故障转移，确保高可用性。"
  },
  {
    question: "HertzBeat 使用什么许可证？",
    answer: "Apache License 2.0。HertzBeat 完全开源，无监控数量或类型限制。"
  },
  {
    question: "HertzBeat 的系统要求是什么？",
    answer: "最低：2 CPU 核心、4GB RAM（推荐 8GB）、10GB 磁盘空间、Docker 20.10+ 或 Java 21+。支持系统：Linux、macOS、Windows。"
  },
  {
    question: "如何升级 HertzBeat？",
    answer: "Docker 升级：停止并删除旧容器，拉取最新镜像，运行新容器。二进制升级：下载新版本，备份配置，替换安装目录。"
  },
  {
    question: "HertzBeat 使用什么数据库？",
    answer: "HertzBeat 默认使用 H2 嵌入式数据库。生产环境可配置外部数据库：MySQL 或 PostgreSQL 用于元数据，VictoriaMetrics、IoTDB、TDengine、InfluxDB 用于时序数据。"
  },
  {
    question: "HertzBeat 能监控隔离网络吗？",
    answer: "可以，通过云边协同。在隔离网络部署边缘采集器，向集中式 HertzBeat 服务器上报，实现统一管理。"
  },
  {
    question: "HertzBeat 有状态页功能吗？",
    answer: "有。HertzBeat 包含状态页构建器，可创建公共状态页（类似 GitHub Status），向用户传达服务可用性。"
  },
  {
    question: "HertzBeat 多久更新一次？",
    answer: "HertzBeat 大约每 2-3 个月发布新版本，包含错误修复、安全补丁和新功能。安全补丁可能更频繁发布。"
  },
  {
    question: "HertzBeat 适合生产环境吗？",
    answer: "适合。HertzBeat 是 Apache 软件基金会项目，被许多组织在生产环境使用。支持高性能集群，已纳入 CNCF 可观测性图谱。"
  },
  {
    question: "可以为 HertzBeat 做贡献吗？",
    answer: "可以。HertzBeat 在 Apache License 2.0 下开源。欢迎通过 GitHub 拉取请求、文档改进、错误报告和功能建议做贡献。"
  }
];

export default function FAQ() {
  return (
    <>
      <FAQSchema faqs={faqs} />
      <Layout
        title="常见问题 - Apache HertzBeat"
        description="Apache HertzBeat 监控系统常见问题和答案 - 安装、功能、兼容性和使用。"
      >
        <main className="container margin-vert--lg">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <h1>常见问题</h1>
              <p className="margin-bottom--lg">
                Apache HertzBeat 监控系统的常见问题。找不到答案？ 
                请访问我们的<a href="/zh-cn/docs/community/contact">社区页面</a>获取支持。
              </p>

              {faqs.map((faq, index) => (
                <div key={index} className="margin-bottom--lg">
                  <h2 id={`faq-${index}`}>{faq.question}</h2>
                  <p>{faq.answer}</p>
                </div>
              ))}

              <div className="margin-top--xl">
                <h2>还有问题？</h2>
                <p>
                  <strong>文档：</strong> <a href="/zh-cn/docs/">https://hertzbeat.apache.org/docs/</a>
                </p>
                <p>
                  <strong>GitHub 讨论：</strong> <a href="https://github.com/apache/hertzbeat/discussions">https://github.com/apache/hertzbeat/discussions</a>
                </p>
                <p>
                  <strong>社区：</strong> <a href="/zh-cn/docs/community/contact">联系我们</a>
                </p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    </>
  );
}
