import type { Field, TextField } from 'payload'

/**
 * An icon name from `react-icons/fa6`, e.g. `FaGithub`.
 *
 * This was `@innovixx/payload-icon-picker-field`, which is out of action on v3
 * for two independent reasons:
 *
 *  1. Its v1 dropped `reactIconPack` in favour of an `icons` map of name to SVG
 *     markup. There is no bundled default, so passing a react-icons pack no
 *     longer works and omitting the option renders an empty picker.
 *  2. It ships `dist/components/IconPicker/index.jsx` with no `.js` alongside,
 *     so a bare directory import of `./IconPicker` cannot be resolved. Because
 *     the generated import map pulls it in from `(payload)/layout.tsx`, that
 *     failure takes down the entire admin panel and every Payload API route,
 *     not just the field.
 *
 * The plugin's field was `type: 'text'` underneath, so this is schema- and
 * data-identical: same column, same stored values, same rendering on the front
 * end, which looks the name up in `react-icons/fa6`. Only the admin widget
 * differs — a text input rather than a visual picker.
 */
type IconFieldOverrides = {
  admin?: TextField['admin']
  label?: string
  name?: string
  required?: boolean
}

export const iconField = ({
  admin,
  label = 'Icon',
  name = 'icon',
  required,
}: IconFieldOverrides = {}): Field => ({
  name,
  label,
  type: 'text',
  required,
  admin: {
    description: 'Icon name from react-icons/fa6, for example FaGithub.',
    ...admin,
  },
})
