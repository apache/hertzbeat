import React from 'react'
import clsx from 'clsx'

export default function Feature({ title, description }) {
    return (
        <div className={clsx('col col--4')}>
            <h3 style={{textAlign: 'center', fontSize: 'x-large'}}>{title}</h3>
            <p>{description}</p>
        </div>
    )
}
