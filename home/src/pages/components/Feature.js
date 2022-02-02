import React from 'react'
import clsx from 'clsx'
import styles from './Feature.module.css'
import cdnTransfer from '../../CdnTransfer'

export default function Feature({ imageUrl, title, description }) {
    const imgUrl = cdnTransfer(imageUrl)
    return (
        <div className={clsx('col col--4', styles.feature)}>
            {imgUrl && (
                <div className="text--center">
                    <img className={styles.featureImage} src={imgUrl} alt={title} />
                </div>
            )}
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    )
}
