import { CATEGORIES } from './categories'
import { LINK_FIELDS } from './link'
import { MEDIA } from './media'
import { META } from './meta'

export const CALL_TO_ACTION = `
...on Cta {
  blockType
  invertBackground
  richText
  links {
    link ${LINK_FIELDS()}
  }
}
`

export const CONTENT = `
...on Content {
  blockType
  blockName
  invertBackground
  columns {
    size
    richText
    enableLink
    link ${LINK_FIELDS()}
  }
}
`

export const MEDIA_BLOCK = `
...on MediaBlock {
  blockType
  invertBackground
  position
  ${MEDIA}
}
`

export const ARCHIVE_BLOCK = `
...on Archive {
  blockType
  blockName
  introContent
  populateBy
  relationTo
  ${CATEGORIES}
  limit
  selectedDocs {
    relationTo
    value {
      ...on Post {
        id
        slug
        title
        ${META}
      }
      ...on Project {
        id
        slug
        title
        ${META}
      }
    }
  }
  populatedDocs {
    relationTo
    value {
      ...on Post {
        id
        slug
        title
        ${CATEGORIES}
        ${META}
      }
      ...on Project {
        id
        slug
        title
        ${CATEGORIES}
        ${META}
      }
    }
  }
  populatedDocsTotal
}
`

export const STACK_PARADE_BLOCK = `
...on StacksParade {
  blockType
  blockName
  introContent
  populateCollection
  ${CATEGORIES}
  limit
  populatedDoc {
    relationTo
    value {
      ...on Post {
        id
        slug
        title
        ${CATEGORIES}
        ${META}
      }
      ...on Project {
        id
        slug
        title
        ${CATEGORIES}
        ${META}
      }
      ...on Stack {
        id
        slug
        title
        ${CATEGORIES}
      }
    }
  }
  populatedDocsTotal
}
`

export const PROJECT_BLOCK = `
...on ProjectBlock {
  id
  blockName
  blockType
  gallery {
    ${MEDIA}
  }
  richText
}
`
