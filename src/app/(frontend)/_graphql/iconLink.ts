export const ICON_LINK_FIELDS = `{
    type
    newTab
    url
    icon
    reference {
      relationTo
      value {
        ...on Page {
          slug
        }
      }
    }
  }`
