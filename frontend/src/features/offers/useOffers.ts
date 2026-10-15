import { useCallback, useState } from 'react';
import { OFFERS_PAGE_SIZE, type Offer, type OfferPatch } from '../../shared/api';
import { api, errorMessage } from '../../api/client';
import { useResource } from '../../hooks/useResource';
import { replaceOffer } from './offers-page';

export type SaveState = 'idle' | 'busy' | 'ok' | 'error';
export interface SaveStatus {
  state: SaveState;
  text: string;
}

const IDLE: SaveStatus = { state: 'idle', text: '' };
const PAGE_SIZE = OFFERS_PAGE_SIZE.default;

/**
 * The Sheet Data tab's state: the current page of offers, optimistic saves that roll back on
 * failure, fulfilment, and the status line describing the last save.
 */
export function useOffers() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SaveStatus>(IDLE);
  const resource = useResource(`offers:${page}`, (signal) => api.listOffers({ page, pageSize: PAGE_SIZE }, signal));
  const { setData, reload: reloadResource } = resource;

  const put = useCallback((offer: Offer) => setData((current) => current && replaceOffer(current, offer)), [setData]);

  const save = useCallback(
    async (offer: Offer, patch: OfferPatch, label: string) => {
      const where = `Offer ${offer.offerId} · ${label}`;
      put({ ...offer, ...patch });
      setStatus({ state: 'busy', text: `Saving · ${where}` });
      try {
        put(await api.updateOffer(offer.offerId, patch));
        setStatus({ state: 'ok', text: `Saved · ${where}` });
      } catch (error) {
        put(offer);
        setStatus({ state: 'error', text: `Not saved · ${where} · ${errorMessage(error)}` });
      }
    },
    [put],
  );

  /** Rejects on failure so the dialog can stay open and show why. */
  const fulfil = useCallback(
    async (offer: Offer, remarks: string, file: File | null) => {
      setStatus({ state: 'busy', text: `${file ? 'Uploading quotation' : 'Saving'} · Offer ${offer.offerId}` });
      try {
        put(await api.fulfilOffer(offer.offerId, remarks, file));
      } catch (error) {
        setStatus({ state: 'error', text: `Not saved · Offer ${offer.offerId} · ${errorMessage(error)}` });
        throw error;
      }
      setStatus({
        state: 'ok',
        text: `Saved · Offer ${offer.offerId} · Progress Update → Fulfilled · Fulfillment Flag → 1${file ? ' · quotation stored' : ''}`,
      });
    },
    [put],
  );

  const reject = useCallback((reason: string) => setStatus({ state: 'error', text: reason }), []);

  const reload = useCallback(() => {
    setStatus(IDLE);
    reloadResource();
  }, [reloadResource]);

  const goToPage = useCallback((next: number) => {
    setStatus(IDLE);
    setPage(next);
  }, []);

  return {
    data: resource.data,
    error: resource.error,
    loading: resource.loading,
    page,
    goToPage,
    reload,
    status,
    save,
    fulfil,
    reject,
  };
}

export type OffersController = ReturnType<typeof useOffers>;
