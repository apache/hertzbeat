import React from 'react'

import Translate, { translate } from '@docusaurus/Translate'

export const features = [
  {
    title: translate({
      message: '开箱即用',
    }),
    description: (
      <>
        <Translate
          values={{
            docker: <code>{'docker run -d -p 1157:1157 tancloud/hertzbeat'}</code>,
            TANCLOUD: <strong>TANCLOUD</strong>,
            SAAS: <strong>SAAS</strong>,
            console: (
              <a href={'https://www.console.tancloud.cn'}>
                <strong>Login Now</strong>
              </a>
            ),
            br: <br />,
          }}
        >
          {'{docker} {br} 一条命令即可开始监控之旅。监控系统集指标采集，指标数据可视化，告警转发一体化。' +
            '一站式全功能，无需为了加一个监控或告警而去编写繁琐的配置文件。{br}' +
            '我们也提供 {TANCLOUD} {SAAS}云版本，{console}即可开始您的服务监控。' +
            '安全是最重要的，我们对账户密钥和监控密钥全链路加密。'}
        </Translate>
      </>
    ),
  },
  {
    title: translate({
      message: '多支持与自定义',
    }),
    description: (
      <>
        <Translate
          values={{
            custom: (
              <a href={'/docs/advanced/extend-point'}>
                <strong>Custom-Monitoring</strong>
              </a>
            ),
            br: <br />,
          }}
        >
          {'我们支持对网站，JVM，MYSQL，Linux等应用服务，数据库，操作系统，中间件的监控，更多监控类型正在快速迭代中。' +
            '更自由化的阈值告警配置，支持邮箱，短信，webhook，钉钉，企业微信，飞书机器人等告警通知。{br}' +
            '不同团队的监控需求千变万化，我们提供{custom}，通过不同的协议SSH，JDBC，JMX，SNMP，HTTP等，仅需配置YML就能自定义监控指标并快速接入监控系统。'}
        </Translate>
      </>
    ),
  },
  {
    title: translate({
      message: '拥抱开源',
    }),
    description: (
      <>
        <Translate
          values={{
            github: (
              <a href={'https://github.com/dromara/hertzbeat'}>
                <strong>HertzBeat Code Github</strong>
              </a>
            ),
            gitee: (
              <a href={'https://gitee.com/dromara/hertzbeat'}>
                <strong>HertzBeat Code Gitee</strong>
              </a>
            ),
            br: <br />,
          }}
        >
          {'HertzBeat监控系统代码全开源，无限制，非常欢迎任何对此有兴趣的同学参与中来，贡献不分大小，我们尊重每一位同学，不限于文档代码或者错别字的贡献，我们一起学习进步，构建属于贡献者们的开源事业。{br}' +
            '中二的我们相信开源改变世界！{br}' +
            '{github} {br}' +
            '{gitee}'}
        </Translate>
      </>
    ),
  },
]

export const dromaraFriends = [
  {
    img: 'maxkey_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/maxkey.png',
    alt: 'MaxKey',
    url: 'https://maxkey.top/',
  },
  {
    img: 'jpom_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/jpom.png',
    alt: 'jpom',
    url: 'https://jpom.io/',
  },
  {
    img: 'fast_request_logo.gif',
    remoteImg: 'https://plus.hutool.cn/images/dromara/fastRequest.gif',
    alt: 'fast-request',
    url: 'https://plugins.sheng90.wang/fast-request/',
  },
  {
    img: 'tlog_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/tlog2.png',
    alt: 'TLog',
    url: 'https://yomahub.com/tlog/',
  },
  {
    img: 'hutool_logo.jpg',
    remoteImg: 'https://plus.hutool.cn/images/dromara/hutool.jpg',
    alt: 'Hutool',
    url: 'https://hutool.cn/',
  },
  {
    img: 'satoken_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/sa-token.png',
    alt: 'Sa-Token',
    url: 'http://sa-token.dev33.cn/',
  },
  {
    img: 'koalas_rpc_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/koalas-rpc2.png',
    alt: 'koalas_rpc',
    url: 'https://gitee.com/dromara/koalas-rpc',
  },
  {
    img: 'liteflow_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/liteflow.png',
    alt: 'LiteFlow',
    url: 'https://yomahub.com/liteflow/',
  },
  {
    img: 'hmily_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/hmily.png',
    alt: 'hmily',
    url: 'https://dromara.org/',
  },
  {
    img: 'forest_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/forest-logo.png',
    alt: 'Forest',
    url: 'https://forest.dtflyx.com/',
  },
  {
    img: 'cubic_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/cubic.png',
    alt: 'cubic',
    url: 'https://cubic.jiagoujishu.com/',
  },
  {
    img: 'raincat_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/raincat.png',
    alt: 'Raincat',
    url: 'https://dromara.org/',
  },
  {
    img: 'sureness_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/sureness.png',
    alt: 'Sureness',
    url: 'https://su.usthe.com/',
  },
  {
    img: 'easy_es_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/easy-es2.png',
    alt: 'easy-es',
    url: 'https://www.easy-es.cn/',
  },
  {
    img: 'dynamic_tp_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/dynamic-tp.png',
    alt: 'dynamic-tp',
    url: 'https://dynamictp.cn/',
  },
  {
    img: 'northstar_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/northstar_logo.png',
    alt: 'northstar',
    url: 'https://gitee.com/dromara/northstar',
  },
  {
    img: 'mendmix_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/mendmix.png',
    alt: 'mendmix',
    url: 'https://www.jeesuite.com/',
  },
  {
    img: 'gobrs_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/gobrs-async.png',
    alt: 'Gobrs-Async',
    url: 'https://async.sizegang.cn/',
  },
  {
    img: 'easypdf_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/x-easypdf.png',
    alt: 'easypdf',
    url: 'https://dromara.gitee.io/x-easypdf/',
  },
  {
    img: 'dante-cloud_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/dante-cloud2.png',
    alt: 'dante-cloud',
    url: 'https://www.herodotus.cn/',
  },
  {
    img: 'image-combiner_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/image-combiner.png',
    alt: 'image-combiner',
    url: 'https://gitee.com/dromara/image-combiner',
  },
  {
    img: 'go-view_logo.png',
    remoteImg: 'https://plus.hutool.cn/images/dromara/go-view.png',
    alt: 'go-view',
    url: 'https://gitee.com/dromara/go-view',
  }
]

export const friendsLink = [
  {
    img: 'hippo4j_logo.png',
    alt: 'hippo4j',
    url: 'https://hippo4j.cn/',
  },
]

export const usersLink = [
  {
    img: 'skyworth_logo.png',
    alt: 'skyworth',
  },
  {
    img: 'sc_edu_logo.png',
    alt: 'sc_edu_logo',
  },
  {
    img: 'cmge_logo.png',
    alt: 'cmge',
  },
  {
    img: 'cnsodata_logo.svg',
    alt: 'cnsodata',
  },
  {
    img: 'tancloud_logo.svg',
    alt: 'tancloud',
  },
  {
    img: 'hibobi_logo.svg',
    alt: 'hibobi',
  }
]

export const SetupExample = `
<dependency>
    <groupId>com.usthe.sureness</groupId>
    <artifactId>sureness-core</artifactId>
    <version>1.0.6</version>
</dependency>

compile group: 'com.usthe.sureness', name: 'sureness-core', version: '1.0.6'
`
