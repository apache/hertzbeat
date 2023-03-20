import React from 'react'

import Translate, { translate } from '@docusaurus/Translate'

export const features = [
  {
    title: translate({
      message: 'convenient',
    }),
    description: (
      <>
        <Translate
          values={{
            docker: <code>{'docker run -d -p 1157:1157 tancloud/hertzbeat'}</code>,
            TANCLOUD: <strong>TANCLOUD</strong>,
            console: (
              <a href={'https://www.console.tancloud.cn'}>
                <strong>Login Now</strong>
              </a>
            ),
            br: <br />,
          }}
        >
          {'convenient-content'}
        </Translate>
      </>
    ),
  },
  {
    title: translate({
      message: 'custom-multi-support',
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
          {'custom-multi-support-content'}
        </Translate>
      </>
    ),
  },
  {
    title: translate({
      message: 'opensource',
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
          {'opensource-content'}
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
    url: 'https://jpom.top/',
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
    url: 'https://sa-token.cc/',
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
    url: 'https://www.quantit.tech',
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
  },
  {
    img: 'neutrino-proxy_logo.png',
    remoteImg: 'https://neutrino-proxy.oss-cn-hangzhou.aliyuncs.com/logo-text-cross-0.5x.png',
    alt: 'neutrino-proxy',
    url: 'https://gitee.com/dromara/neutrino-proxy',
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
