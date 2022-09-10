import React from 'react'
import clsx from 'clsx'
import styles from './LogoCarousel.module.css'

const iconCommonUrl = '/img/icons/'

export default class LogoCarouselStatic extends React.Component {
    constructor (props) {
        super(props)
    }

    render () {
        if (!this.props || !this.props.logos) {
            return (
                <div/>
            )
        }
        this.list = () => (
            <ul>
                {this.props.logos.map((value, index) => (
                    <li key={index}>
                        <a href={value.url} target="_blank" rel="noopener noreferrer">
                            <img style={{ maxHeight: '80px', maxWidth: '100px' }} src={iconCommonUrl + value.img} alt={value.alt} />
                        </a>
                    </li>
                ))}
            </ul>
        )

        return (
            <>
                <div className={styles.companyUsage} ref={this.containerRef}>
                    <h3>{this.props.headerTitle}</h3>
                    <div className={clsx(styles.logos)}>
                        {this.list()}
                    </div>
                </div>
            </>
        )
    }
}
