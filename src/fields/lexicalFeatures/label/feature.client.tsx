'use client'

import { $findMatchingParent } from '@lexical/utils'
import { $setBlocksType } from '@lexical/selection'
import {
  createClientFeature,
  slashMenuBasicGroupWithItems,
  toolbarFormatGroupWithItems,
} from '@payloadcms/richtext-lexical/client'
import { $getSelection, $isRangeSelection } from 'lexical'

import { LabelIcon } from './Icon'
import { $createLabelNode, $isLabelNode, LabelNode } from './nodes/LabelNode'

import './index.scss'

const apply = ({ editor }: { editor: any }): void => {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createLabelNode())
    }
  })
}

const toolbarGroups = [
  toolbarFormatGroupWithItems([
    {
      ChildComponent: LabelIcon,
      isActive: ({ selection }: any) => {
        if (!$isRangeSelection(selection)) return false
        // The v2 feature used getSelectedNode, which v3 no longer exports.
        // Walking up from the anchor answers the same question: is the caret
        // inside one of these blocks?
        return $findMatchingParent(selection.anchor.getNode(), $isLabelNode) != null
      },
      key: 'label',
      label: 'Label',
      onSelect: apply,
      order: 20,
    },
  ]),
]

export const LabelFeatureClient = createClientFeature({
  nodes: [LabelNode],
  slashMenu: {
    groups: [
      slashMenuBasicGroupWithItems([
        {
          Icon: LabelIcon,
          key: 'label',
          keywords: ['label'],
          label: 'Label',
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
