import React, { HTMLAttributes } from 'react'
import { IconType } from 'react-icons'
import * as Icons from 'react-icons/fa6'

export type IconTypes = keyof typeof Icons

interface IconProps extends HTMLAttributes<SVGAElement> {
  name: IconTypes
  className?: string
}

const getIconComponent = (name: IconTypes): IconType => {
  const icons = Icons as Record<string, React.ComponentType>
  return icons[name as keyof typeof icons] as IconType
}

const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
  const IconComponent = getIconComponent(name)

  return <IconComponent className={className} {...props} />
}

export default Icon
