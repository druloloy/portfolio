import { lexicalEditor, LinkFeature, ParagraphFeature } from '@payloadcms/richtext-lexical'
import path from 'path'
import type { CollectionConfig } from 'payload'
import { fileURLToPath } from 'url'

// ESM has no __dirname, and v3 requires staticDir to be an absolute path.
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: path.resolve(dirname, '../../media'),
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      // Was slateEditor with only the link element enabled. The Lexical
      // equivalent is an editor limited to paragraphs and links, so captions
      // keep the same authoring surface after Slate is dropped.
      editor: lexicalEditor({
        features: () => [ParagraphFeature(), LinkFeature({})],
      }),
    },
  ],
}
