interface Args {
  disableLabel?: true
  disableAppearance?: true
  disableIcon?: true
}

export const LINK_FIELDS = ({
  disableAppearance,
  disableLabel,
  disableIcon,
}: Args = {}): string => `{
  ${!disableLabel ? 'label' : ''}
  ${!disableAppearance ? 'appearance' : ''}
  ${!disableIcon ? 'icon' : ''}
  type
  newTab
  url
  reference {
    relationTo
    value {
      ...on Page {
        slug
      }
    }
  }
}`
