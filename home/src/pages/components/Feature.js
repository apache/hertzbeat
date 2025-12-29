import React from 'react'
import clsx from 'clsx'
import styles from '../styles.module.css'

export default function Feature({ title, description, index = 0 }) {
    return (
        <div
            className={clsx('featureCard', styles.featureCard)}
            style={{
                animationDelay: `${index * 0.1}s`
            }}
        >
            <h3 className={styles.featureTitle}>{title}</h3>
            <p className={styles.featureDescription}>{description}</p>
        </div>
    )
}
