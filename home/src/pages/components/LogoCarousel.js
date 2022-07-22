import React from 'react'
import clsx from 'clsx'
import styles from './LogoCarousel.module.css'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

const cdnUrl = 'https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/icons/'

var settings = {
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 500,
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
            <ul style={{ transform: `translate(${this.state.position}px, 0px)` }}>
                {this.props.logos.map((value, index) => (
                    <li key={index}><a href={value.url} target="_blank" rel="noopener noreferrer"><img src={cdnUrl + value.img} alt={value.alt} /></a></li>
                ))}
            </ul>
        )

        return (
            <>
                <div className={styles.companyUsage} ref={this.containerRef}>
                    <h3>{this.props.headerTitle}</h3>
                    <div className={clsx(styles.logos)}>
                        <Slider {...settings}>
                            {this.props.logos.map((value, index) => (
                                <li key={index}><a href={value.url} target="_blank" rel="noopener noreferrer"><img src={cdnUrl + value.img} alt={value.alt} /></a></li>
                            ))}
                        </Slider>
                    </div>
                </div>
            </>
        )
    }
}
