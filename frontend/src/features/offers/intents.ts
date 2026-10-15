// What each Sheet Data control means as a change to an offer. Pure functions: the table calls
// them, useOffers applies the result, and tests can check every rule without a browser.
import type { Offer, OfferPatch } from '../../shared/api';

export type Intent = { kind: 'save'; patch: OfferPatch; label: string } | { kind: 'reject'; reason: string };

const save = (patch: OfferPatch, label: string): Intent => ({ kind: 'save', patch, label });
const flag = (value: boolean) => (value ? 1 : 0);

export const offerIntents = {
  setPriority: (value: Offer['priority']) => save({ priority: value }, `Priority → ${value || '(cleared)'}`),

  toggleWorked: (offer: Offer, employeeName: string): Intent => {
    const name = employeeName.trim();
    if (!offer.worked && !name) {
      return { kind: 'reject', reason: 'Enter your name at the top before marking an offer as worked' };
    }
    return save({ worked: !offer.worked, workedBy: offer.worked ? '' : name }, `Worked_flag → ${flag(!offer.worked)}`);
  },

  toggleLms: (offer: Offer) => save({ lms: !offer.lms }, `Interaction via LMS → ${flag(!offer.lms)}`),

  call: () => save({ callAttempted: true }, 'Call Attempted → 1'),

  /** Any status except Fulfilled, which goes through the fulfilment dialog. */
  setProgress: (offer: Offer, value: Exclude<Offer['progress'], 'Fulfilled'>): Intent => {
    if (offer.progress === 'Fulfilled') {
      return save(
        { progress: value, fulfillmentFlag: false },
        `Progress Update → ${value || '(cleared)'} · Fulfillment Flag → 0`,
      );
    }
    return save({ progress: value }, `Progress Update → ${value || '(cleared)'}`);
  },

  comment: (text: string) => save({ comment: text }, 'Comment updated'),
};
