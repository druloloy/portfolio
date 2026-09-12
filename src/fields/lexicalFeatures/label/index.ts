import { createNode, createServerFeature } from '@payloadcms/richtext-lexical'

import { LabelNode } from './nodes/LabelNode'

// v3 splits a feature in two. The server half registers the node so the field
// can serialise it; everything that touches the editor UI lives in the client
// half, which is referenced by path string and resolved through the generated
// import map — the same mechanism as custom admin components.
export const LabelFeature = createServerFeature({
  feature: {
    ClientFeature: '@/fields/lexicalFeatures/label/feature.client#LabelFeatureClient',
    clientFeatureProps: null,
    nodes: [createNode({ node: LabelNode })],
  },
  key: 'label',
})
