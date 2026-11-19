/**
 * Halchal (হালচাল) - Bengali Notification Message Templates
 * Architecture: Bengali-First (CLAUDE.md), ADR-0003, ADR-0006
 */

import { UtilityCategory, ZoneState, NotificationMessagePayload } from '../_shared/types.ts';

export const CATEGORY_NAMES_BN: Record<UtilityCategory, { name: string; colloquial: string }> = {
  electricity: { name: 'বিদ্যুৎ', colloquial: 'কারেন্ট' },
  gas: { name: 'গ্যাস', colloquial: 'গ্যাস' },
  water: { name: 'পানি', colloquial: 'পানি' },
  lpg: { name: 'এলপিজি', colloquial: 'এলপিজি' },
};

/**
 * Builds localized notification content for utility status change
 */
export function buildStatusNotification(params: {
  areaNameBn?: string;
  category: UtilityCategory;
  state: ZoneState;
  h3Index: string;
}): NotificationMessagePayload {
  const { areaNameBn, category, state, h3Index } = params;
  const cat = CATEGORY_NAMES_BN[category] || { name: 'সেবা', colloquial: 'সেবা' };
  const area = areaNameBn ? `${areaNameBn} এলাকায়` : 'আপনার এলাকায়';

  let title = '';
  let body = '';

  if (state === 'out') {
    title = `⚠️ হালচাল - ${area} ${cat.colloquial} নেই`;
    body = `${area} ${cat.name} সংযোগ বিচ্ছিন্ন রয়েছে (বন্ধ)। নাগরিকরা সতর্ক থাকুন।`;
  } else if (state === 'low') {
    title = `⚠️ হালচাল - ${area} ${cat.name} চাপ কম`;
    body = `${area} ${cat.name} সরবরাহ স্বল্প বা চাপ কম রয়েছে।`;
  } else if (state === 'ok') {
    title = `✅ হালচাল - ${area} ${cat.colloquial} ফিরেছে`;
    body = `${area} ${cat.name} সংযোগ স্বাভাবিক হয়েছে। হালনাগাদ তথ্য দেখতে ট্যাপ করুন।`;
  } else {
    title = `হালচাল - ${area} ${cat.name} আপডেট`;
    body = `${area} ${cat.name} সংক্রান্ত নতুন তথ্য রয়েছে।`;
  }

  return {
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `halchal-${h3Index}-${category}`,
    data: {
      type: 'status_alert',
      h3_index: h3Index,
      category,
      state,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Builds localized 30-minute interactive confirmation notification
 * with signed action token for one-tap voting
 */
export function buildInteractiveConfirmationNotification(params: {
  areaNameBn?: string;
  category: UtilityCategory;
  h3Index: string;
  actionToken: string;
}): NotificationMessagePayload {
  const { areaNameBn, category, h3Index, actionToken } = params;
  const cat = CATEGORY_NAMES_BN[category] || { name: 'বিদ্যুৎ', colloquial: 'কারেন্ট' };
  const areaTitle = areaNameBn ? `হালচাল - ${areaNameBn}` : 'হালচাল';

  return {
    title: `${areaTitle} (${cat.name} সংযোগ যাচাই)`,
    body: `আপনার এলাকায় কি ${cat.colloquial} ফিরেছে?`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `halchal-restore-${h3Index}-${category}`,
    data: {
      type: 'interactive_confirmation',
      h3_index: h3Index,
      category,
      action_token: actionToken,
      restore_url: '/api/restore-vote',
      timestamp: new Date().toISOString(),
    },
    actions: [
      {
        action: 'vote_ok',
        title: 'হ্যাঁ, ফিরেছে',
      },
      {
        action: 'vote_out',
        title: 'না, এখনো নেই',
      },
    ],
  };
}
