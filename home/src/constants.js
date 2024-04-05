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
                Github Repo
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
