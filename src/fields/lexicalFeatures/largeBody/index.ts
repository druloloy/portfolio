import { createNode, createServerFeature } from '@payloadcms/richtext-lexical'

import { LargeBodyNode } from './nodes/LargeBodyNode'

// v3 splits a feature in two. The server half registers the node so the field
// can serialise it; everything that touches the editor UI lives in the client
// half, which is referenced by path string and resolved through the generated
// import map — the same mechanism as custom admin components.
export const LargeBodyFeature = createServerFeature({
  feature: {
    ClientFeature: '@/fields/lexicalFeatures/largeBody/feature.client#LargeBodyFeatureClient',
    clientFeatureProps: null,
    nodes: [createNode({ node: LargeBodyNode })],
  },
  key: 'largeBody',
})
