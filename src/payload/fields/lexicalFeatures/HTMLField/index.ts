import type { FeatureProvider, UploadFeatureProps } from '@payloadcms/richtext-lexical'
import { SlashMenuOption, UploadNode } from '@payloadcms/richtext-lexical'

import HTMLField from './nodes/HTMLField'

export const UploadHTMLFeature = (props?: UploadFeatureProps | {}): FeatureProvider => {
  return {
    feature: () => {
      return {
        nodes: [
          {
            converters: {
              html: HTMLField, // <= This is where you define your HTML Converter
            },
            node: UploadNode,
            type: UploadNode.getType(),
            //...
          },
        ],
        plugins: [
          /*...*/
        ],
        props: props,
        slashMenu: {
          /*...*/
        },
      }
    },
    key: 'upload',
  }
}
