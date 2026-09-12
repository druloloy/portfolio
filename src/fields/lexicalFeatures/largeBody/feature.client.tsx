'use client'

import { $findMatchingParent } from '@lexical/utils'
import { $setBlocksType } from '@lexical/selection'
import {
  createClientFeature,
  slashMenuBasicGroupWithItems,
  toolbarFormatGroupWithItems,
} from '@payloadcms/richtext-lexical/client'
import { $getSelection, $isRangeSelection } from 'lexical'

import { LargeBodyIcon } from './Icon'
import { $createLargeBodyNode, $isLargeBodyNode, LargeBodyNode } from './nodes/LargeBodyNode'

import './index.scss'

const apply = ({ editor }: { editor: any }): void => {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createLargeBodyNode())
    }
  })
}

const toolbarGroups = [
  toolbarFormatGroupWithItems([
    {
      ChildComponent: LargeBodyIcon,
      isActive: ({ selection }: any) => {
        if (!$isRangeSelection(selection)) return false
        // The v2 feature used getSelectedNode, which v3 no longer exports.
        // Walking up from the anchor answers the same question: is the caret
        // inside one of these blocks?
        return $findMatchingParent(selection.anchor.getNode(), $isLargeBodyNode) != null
      },
      key: 'largeBody',
      label: 'Large Body',
      onSelect: apply,
      order: 20,
    },
  ]),
]

export const LargeBodyFeatureClient = createClientFeature({
  nodes: [LargeBodyNode],
  slashMenu: {
    groups: [
      slashMenuBasicGroupWithItems([
        {
          Icon: LargeBodyIcon,
          key: 'largeBody',
          keywords: ['large', 'body'],
          label: 'Large Body',
          onSelect: apply,
        },
      ]),
    ],
  },
  // v2 only put these in the floating selection toolbar. v3 has a fixed and an
  // inline toolbar; registering both keeps the control reachable either way.
  toolbarFixed: { groups: toolbarGroups },
  toolbarInline: { groups: toolbarGroups },
})
