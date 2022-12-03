import React from 'react'
import clsx from 'clsx'
import styles from './LogoCarousel.module.css'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

const iconCommonUrl = '/img/icons/'

// const cdnUrl = '/img/icons/'

var settings = {
    dots: false,
    infinite: true,
    speed: 800,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 800,
    rows: 1,
    vertical: false
};

export default class LogoCarousel extends React.Component {
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
            <Slider {...settings}>
                {this.props.logos.map((value, index) => (
                    <a key={index} href={value.url == null ? '#' : value.url} target="_blank" rel="noopener noreferrer">
                        <img style={{ maxHeight: '100px', maxWidth: '120px' }} src={value.remoteImg == null ? iconCommonUrl + value.img : value.remoteImg}
                             onError={(e) => e.target.src = iconCommonUrl + value.img} alt={value.alt} />
                    </a>
                ))}
            </Slider>
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
