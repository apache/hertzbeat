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
