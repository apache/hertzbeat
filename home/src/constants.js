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
            docker: <code>{'docker run -d -p 1157:1157 -p 1158:1158 tancloud/hertzbeat'}</code>,
            console: (
              <a href={'https://www.console.tancloud.cn'}>
                Login Now
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
                HertzBeat Code Github
              </a>
            ),
            gitee: (
              <a href={'https://gitee.com/dromara/hertzbeat'}>
                HertzBeat Code Gitee
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
    remoteImg: 'https://oss.dev33.cn/sa-token/link/liteflow.png',
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
  },
  {
    img: 'ruoyi_vue_plus_logo.png',
    remoteImg: 'https://foruda.gitee.com/images/1679673773341074847/178e8451_1766278.png',
    alt: 'RuoYi-Vue-Plus',
    url: 'https://javalionli.gitee.io/plus-doc',
  },
  {
    img: 'stream-query_logo.png',
    remoteImg: 'https://waibi.oss-cn-chengdu.aliyuncs.com/picGo/logo.png',
    alt: 'stream-query',
    url: 'https://dromara.gitee.io/stream-query',
  },
  {
    img: 'sms_aggregator_logo.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/sms4j.png',
    alt: 'SMS4J',
    url: 'https://wind.kim',
  },
  {
    img: 'cloudeon.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/cloudeon.png',
    alt: 'CloudEon',
    url: 'https://cloudeon.top/',
  },
  {
    img: 'hodor.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/hodor.png',
    alt: 'Hodor',
    url: 'https://github.com/dromara/hodor',
  },
  {
    img: 'test-hub.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/test-hub.png',
    alt: 'TestHub',
    url: 'http://nsrule.com/',
  },
  {
    img: 'disjob.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/disjob-2.png',
    alt: 'DisJob',
    url: 'https://gitee.com/dromara/disjob',
  },
  {
    img: 'Binlog4j.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/Binlog4j.png',
    alt: 'Binlog4J',
    url: 'https://gitee.com/dromara/binlog4j',
  },
  {
    img: 'yft-design.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/yft-design.png',
    alt: 'yft-design',
    url: 'https://gitee.com/dromara/yft-design',
  },
  {
    img: 'file4j.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/file4j.png',
    alt: 'file4j',
    url: 'https://gitee.com/dromara/spring-file-storage',
  },
  {
    img: 'wemq.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/wemq.png',
    alt: 'WeMQ',
    url: 'https://wemq.nicholasld.cn/',
  },
  {
    img: 'mayfly-go.png',
    remoteImg: 'https://oss.dev33.cn/sa-token/link/mayfly-go.png',
    alt: 'Mayfly-Go',
    url: 'https://gitee.com/dromara/mayfly-go',
  },
  {
    img: 'akali.svg',
    remoteImg: 'https://akali.yomahub.com/logo.svg',
    alt: 'akali',
    url: 'https://akali.yomahub.com/',
  },
  {
    img: 'dbswitch.png',
    remoteImg: 'https://dbswitch.gitee.io/docs-site/images/logo.png',
    alt: 'dbswitch',
    url: 'https://dbswitch.gitee.io/docs-site/#/',
  }
]

export const friendsLink = [
  {
    img: 'hippo4j_logo.png',
    alt: 'hippo4j',
    url: 'https://hippo4j.cn/',
  },
  {
    img: 'bugstack_logo.png',
    alt: 'bugStack',
    url: 'https://bugstack.cn/',
  }
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
