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
            docker: <code>{'docker run -d -p 1157:1157 apache/hertzbeat'}</code>,
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
              <a href={'https://github.com/apache/hertzbeat'}>
                Github
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
    img: 'tancloud-logo.svg',
    alt: 'tancloud',
  }
]
