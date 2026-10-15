import type { Offer, OffersPage } from '../../shared/api';

const delta = (before: boolean, after: boolean) => Number(after) - Number(before);

/** The page with `next` swapped in, and the all-offer counts adjusted for whatever changed. */
export function replaceOffer(page: OffersPage, next: Offer): OffersPage {
  const previous = page.items.find((offer) => offer.offerId === next.offerId);
  if (!previous) return page;
  return {
    ...page,
    items: page.items.map((offer) => (offer.offerId === next.offerId ? next : offer)),
    stats: {
      ...page.stats,
      worked: page.stats.worked + delta(previous.worked, next.worked),
      called: page.stats.called + delta(previous.callAttempted, next.callAttempted),
    },
  };
}
