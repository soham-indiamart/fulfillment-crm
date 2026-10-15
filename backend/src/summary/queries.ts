// Summary tab SQL. Every dated query groups by the India-time day of approved_at and takes the
// [$1, $2] day range. `summary` holds every BL (approved and deleted); fulfillment_offers holds flags.
import { TZ } from '../shared/dates.js';
import { flagIsSet } from '../offers/fields.js';

const DAY = `to_char((approved_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD')`;
const IN_RANGE = `approved_at >= ($1::date::timestamp AT TIME ZONE '${TZ}')
  AND approved_at < (($2::date + 1)::timestamp AT TIME ZONE '${TZ}')`;

export const FUNNEL_BY_DAY = `
  SELECT ${DAY} AS day,
         count(*)::int AS generated,
         count(*) FILTER (WHERE approved_flag)::int AS approved,
         count(*) FILTER (WHERE approved_flag AND purchases > 0)::int AS purchased,
         count(*) FILTER (WHERE approved_flag AND (purchases > 0 OR astbuy_count > 0))::int AS connected
  FROM summary WHERE ${IN_RANGE} GROUP BY 1`;

export const FULFILLED_BY_DAY = `
  SELECT ${DAY} AS day, count(DISTINCT offer_id)::int AS fulfilled
  FROM fulfillment_offers WHERE ${flagIsSet('fulfillment_flag')} AND ${IN_RANGE} GROUP BY 1`;

export const DELETED_BY_DAY_AND_REASON = `
  SELECT ${DAY} AS day, deletion_reason_id AS reason, count(*)::int AS deleted
  FROM summary WHERE approved_flag IS NOT TRUE AND ${IN_RANGE} GROUP BY 1, 2`;

export const DELETION_REASONS = `
  SELECT DISTINCT deletion_reason_id AS reason
  FROM summary WHERE approved_flag IS NOT TRUE ORDER BY 1 NULLS LAST`;
