'use client'
import React, { Fragment } from 'react'
import { FaXmark } from 'react-icons/fa6'
import Slider, { Settings as SliderSettings } from 'react-slick'

import type { Media as MediaType } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { Media } from '../../_components/Media'
import RichText from '../../_components/RichText'
import { ProjectBlockProps } from './types'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import './slider.scss'

import classes from './index.module.scss'

type Props = ProjectBlockProps & {
  gallery?: MediaType[]
}

const GalleryModal: React.FC<{
  gallery: { media: MediaType | string }[]
  closeModal: () => void
}> = ({ gallery, closeModal }) => {
  const sliderSettings: SliderSettings = {
    infinite: false,
    speed: 1000,
    slidesToShow: 3,
    slidesToScroll: 1,
    centerMode: false,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          centerMode: true,
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  }

  return (
    <Fragment>
      <div className={classes.projectBlock__modal}>
        <Slider {...sliderSettings} className={classes.projectBlock__modal__gallery}>
          {gallery?.map(({ media }, i) => (
            <Media key={i} resource={media} className={classes.projectBlock__modal__gallery_item} />
          ))}
        </Slider>
      </div>
      <button onClick={closeModal} className={classes.projectBlock__modal__close}>
        <FaXmark />
      </button>
    </Fragment>
  )
}

export const ProjectBlock: React.FC<Props> = props => {
  const { richText, gallery } = props
  const [showGalleryModal, setShowGalleryModal] = React.useState(false)
  const openGalleryModal = () => setShowGalleryModal(true)
  const closeGalleryModal = () => setShowGalleryModal(false)

  return (
    <Fragment>
      <Gutter>
        <div className={classes.projectBlock}>
          <div className={classes.projectBlock__gallery}>
            <h2 className={classes.projectBlock__gallery_title}>Gallery</h2>
            <div className={classes.projectBlock__gallery__contents}>
              {gallery?.map(({ media }, i) => (
                <Media
                  onClick={openGalleryModal}
                  key={i}
                  resource={media}
                  className={classes.projectBlock__gallery__contents_item}
                />
              ))}
            </div>
          </div>
          <div className={classes.content}>
            <RichText content={richText} />
          </div>
        </div>
      </Gutter>
      {showGalleryModal && <GalleryModal gallery={gallery} closeModal={closeGalleryModal} />}
    </Fragment>
  )
}
