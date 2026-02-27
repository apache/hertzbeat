import React from 'react'
import clsx from 'clsx'
import styles from '../styles.module.css'

export default function Section({ children, className }) {
    return (
        <section className={clsx(styles.section, className)}>
            <div className="container">
                <div className={styles.sectionRow}>
                    {children}
                </div>
            </div>
        </section>
    )
}
