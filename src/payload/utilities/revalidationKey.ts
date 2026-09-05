/**
 * The shared secret for the on-demand revalidation route.
 *
 * This exists because the sender and the receiver disagreed. The route at
 * `src/app/next/revalidate/route.ts` compared the incoming secret against
 * `NEXT_PRIVATE_REVALIDATION_KEY`, while every caller sent
 * `REVALIDATION_KEY`. Both variables are set in this project's environment and
 * they hold *different* values, so every revalidation request was answered with
 * `400 Invalid request` and silently logged as an error. The cache was never
 * busted by a publish.
 *
 * Reading both names from one place means the two sides can no longer drift,
 * and a deployment that sets only one of them still works.
 */
export const getRevalidationKey = (): string | undefined =>
  process.env.NEXT_PRIVATE_REVALIDATION_KEY || process.env.REVALIDATION_KEY
