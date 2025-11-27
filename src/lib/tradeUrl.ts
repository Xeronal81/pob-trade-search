import type { PobItem } from '../types/pob';

export interface TradeQuery {
  query: {
    status: { option: string };
    name?: string;
    type?: string;
    filters?: Record<string, unknown>;
    stats?: Array<{
      type: string;
      filters: Array<{
        id: string;
        value?: { min?: number; max?: number };
        disabled?: boolean;
      }>;
    }>;
  };
  sort: { price: string };
}

/**
 * Generates a trade site URL for an item
 */
export function generateTradeUrl(item: PobItem, league: string = 'Standard'): string {
  const query = buildTradeQuery(item);
  const encodedQuery = encodeURIComponent(JSON.stringify(query));

  // The trade site accepts a query parameter that auto-searches
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodedQuery}`;
}

/**
 * Builds a trade query object for an item
 */
export function buildTradeQuery(item: PobItem): TradeQuery {
  const query: TradeQuery = {
    query: {
      status: { option: 'online' },
    },
    sort: { price: 'asc' },
  };

  // For unique items, search by name
  if (item.rarity === 'Unique') {
    query.query.name = item.name;
    query.query.type = item.basetype !== item.name ? item.basetype : undefined;
  } else {
    // For rare/magic items, search by base type
    query.query.type = item.basetype;
  }

  // Add influence filters if present
  if (item.influenced) {
    const miscFilters: Record<string, { option: boolean }> = {};

    if (item.influenced.shaper) miscFilters.shaper_item = { option: true };
    if (item.influenced.elder) miscFilters.elder_item = { option: true };
    if (item.influenced.crusader) miscFilters.crusader_item = { option: true };
    if (item.influenced.hunter) miscFilters.hunter_item = { option: true };
    if (item.influenced.redeemer) miscFilters.redeemer_item = { option: true };
    if (item.influenced.warlord) miscFilters.warlord_item = { option: true };

    if (Object.keys(miscFilters).length > 0) {
      query.query.filters = {
        ...query.query.filters,
        misc_filters: {
          filters: miscFilters,
        },
      };
    }
  }

  // Add corrupted filter for unique items if corrupted
  if (item.corrupted && item.rarity === 'Unique') {
    query.query.filters = {
      ...query.query.filters,
      misc_filters: {
        ...(query.query.filters?.misc_filters as Record<string, unknown> || {}),
        filters: {
          ...((query.query.filters?.misc_filters as Record<string, unknown>)?.filters as Record<string, unknown> || {}),
          corrupted: { option: true },
        },
      },
    };
  }

  return query;
}

/**
 * Generates a simple trade URL that just searches by name/type
 * This is more reliable as it doesn't depend on exact query structure
 */
export function generateSimpleTradeUrl(item: PobItem, league: string = 'Standard'): string {
  const baseUrl = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`;

  if (item.rarity === 'Unique') {
    // For uniques, use the name search
    const searchName = encodeURIComponent(item.name);
    return `${baseUrl}?name=${searchName}`;
  } else {
    // For rares, search by base type
    const searchType = encodeURIComponent(item.basetype);
    return `${baseUrl}?type=${searchType}`;
  }
}

/**
 * Gets the item slot display name
 */
export function getSlotDisplayName(slot: string | undefined): string {
  if (!slot) return 'Unknown Slot';

  const slotNames: Record<string, string> = {
    'Weapon 1': 'Main Hand',
    'Weapon 2': 'Off Hand',
    'Weapon 1 Swap': 'Swap Main Hand',
    'Weapon 2 Swap': 'Swap Off Hand',
    'Body Armour': 'Body Armour',
    'Helmet': 'Helmet',
    'Gloves': 'Gloves',
    'Boots': 'Boots',
    'Amulet': 'Amulet',
    'Ring 1': 'Left Ring',
    'Ring 2': 'Right Ring',
    'Belt': 'Belt',
    'Flask 1': 'Flask 1',
    'Flask 2': 'Flask 2',
    'Flask 3': 'Flask 3',
    'Flask 4': 'Flask 4',
    'Flask 5': 'Flask 5',
  };

  return slotNames[slot] || slot;
}

/**
 * Gets rarity color class
 */
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    'Normal': '#c8c8c8',
    'Magic': '#8888ff',
    'Rare': '#ffff77',
    'Unique': '#af6025',
  };
  return colors[rarity] || '#ffffff';
}

/**
 * Available leagues - this could be fetched from API in a production app
 */
export const LEAGUES = [
  'Phrecia',
  'Hardcore Phrecia',
  'Standard',
  'Hardcore',
];
