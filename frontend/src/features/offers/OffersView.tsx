// The Sheet Data tab: maps table controls to intents, and owns the fulfilment dialog and
// GL Admin window. Data and saving come from useOffers (passed in by App).
import { useState } from 'react';
import type { Offer } from '../../shared/api';
import { Pager } from '../../components/Pager';
import { FulfillDialog } from './FulfillDialog';
import { offerIntents, type Intent } from './intents';
import { OfferWindow } from './OfferWindow';
import { canEmbedGlAdmin, glAdminUrl } from './offer-utils';
import { SheetTable, type SheetTableActions } from './SheetTable';
import type { OffersController } from './useOffers';

interface OffersViewProps {
  offers: OffersController;
  employeeName: string;
  /** Called when an action needs the employee's name first. */
  onNameRequired: () => void;
}

export function OffersView({ offers, employeeName, onNameRequired }: OffersViewProps) {
  const [fulfilling, setFulfilling] = useState<Offer | null>(null);
  const [glWindow, setGlWindow] = useState<{ offerId: string; url: string } | null>(null);
  const { data, error, loading } = offers;

  const apply = (offer: Offer, intent: Intent) => {
    if (intent.kind === 'save') {
      void offers.save(offer, intent.patch, intent.label);
      return;
    }
    offers.reject(intent.reason);
    onNameRequired();
  };

  const actions: SheetTableActions = {
    setPriority: (offer, value) => apply(offer, offerIntents.setPriority(value)),
    toggleWorked: (offer) => apply(offer, offerIntents.toggleWorked(offer, employeeName)),
    toggleLms: (offer) => apply(offer, offerIntents.toggleLms(offer)),
    call: (offer) => apply(offer, offerIntents.call()),
    setProgress: (offer, value) =>
      value === 'Fulfilled' ? setFulfilling(offer) : apply(offer, offerIntents.setProgress(offer, value)),
    saveComment: (offer, text) => apply(offer, offerIntents.comment(text)),
    openOffer: (offer) => {
      const url = glAdminUrl(offer.offerId);
      if (canEmbedGlAdmin()) setGlWindow({ offerId: offer.offerId, url });
      else window.open(url, 'gladmin', 'popup,width=1280,height=860');
    },
  };

  if (!data) {
    return error ? (
      <div className="load-error" role="alert">
        <p>{error.message}</p>
        <button type="button" className="btn" onClick={offers.reload}>
          Try again
        </button>
      </div>
    ) : (
      <p className="muted">Loading offers…</p>
    );
  }

  return (
    <>
      {error && (
        <p className="error-text" role="alert">
          Could not refresh: {error.message}
        </p>
      )}
      <SheetTable
        offers={data.items}
        stats={data.stats}
        actions={actions}
        pendingOfferId={fulfilling?.offerId}
        busy={loading}
      />
      <Pager
        page={offers.page}
        pageSize={data.pageSize}
        total={data.stats.total}
        disabled={loading}
        onChange={offers.goToPage}
      />
      {fulfilling && (
        <FulfillDialog
          offer={fulfilling}
          onCancel={() => setFulfilling(null)}
          onSubmit={async ({ remarks, file }) => {
            await offers.fulfil(fulfilling, remarks, file);
            setFulfilling(null);
          }}
        />
      )}
      {glWindow && <OfferWindow {...glWindow} onClose={() => setGlWindow(null)} />}
    </>
  );
}
