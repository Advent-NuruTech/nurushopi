export interface TrendingSignals {
  ageHours: number;
  views: number;
  uniqueViewers: number;
  cartAdds: number;
  wishlistAdds: number;
  purchases: number;
  unitsSold: number;
  reviewActivity: number;
  suspiciousEvents: number;
}

export function timeDecay(ageHours: number, halfLifeHours = 12): number {
  return Math.pow(0.5, Math.max(ageHours, 0) / Math.max(halfLifeHours, 0.01));
}

/** Intent-weighted velocity with uniqueness caps, time decay and an abuse penalty. */
export function trendingScore(signal: TrendingSignals): number {
  const uniqueViews = Math.min(signal.uniqueViewers, signal.views);
  const repeatedViews = Math.max(signal.views - uniqueViews, 0);
  const intent =
    uniqueViews * 1.5 + repeatedViews * 0.05 + signal.wishlistAdds * 3 +
    signal.cartAdds * 4 + signal.purchases * 8 + signal.unitsSold * 2 +
    signal.reviewActivity * 1.5;
  const abusePenalty = 1 / (1 + Math.max(signal.suspiciousEvents, 0) * 0.5);
  return intent * timeDecay(signal.ageHours) * abusePenalty;
}

export interface BestsellerSignals {
  unitsSold: number;
  revenue: number;
  impressions: number;
  purchases: number;
  cancellations: number;
  returns: number;
  rating?: number;
}

export function bestsellerScore(signal: BestsellerSignals): number {
  const conversion = signal.impressions > 0 ? signal.purchases / signal.impressions : 0;
  const gross = signal.unitsSold * 5 + Math.log1p(Math.max(signal.revenue, 0)) * 3 + conversion * 20;
  const quality = signal.rating == null ? 1 : Math.min(Math.max(signal.rating / 5, 0.5), 1);
  const failureRate = signal.purchases > 0
    ? (signal.cancellations + signal.returns) / signal.purchases
    : 0;
  return Math.max(0, gross * quality * Math.max(0.1, 1 - failureRate));
}

