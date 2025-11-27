export type ItemRarity = 'Normal' | 'Magic' | 'Rare' | 'Unique';

/**
 * Represents a mod with both display text and original text for searching
 */
export interface ItemMod {
  /** Display text with # placeholders instead of values */
  display: string;
  /** Original text with actual values for trade site searches */
  original: string;
}

export type ItemSlot =
  | 'Weapon 1'
  | 'Weapon 2'
  | 'Weapon 1 Swap'
  | 'Weapon 2 Swap'
  | 'Helmet'
  | 'Body Armour'
  | 'Gloves'
  | 'Boots'
  | 'Amulet'
  | 'Ring 1'
  | 'Ring 2'
  | 'Belt'
  | 'Flask 1'
  | 'Flask 2'
  | 'Flask 3'
  | 'Flask 4'
  | 'Flask 5'
  | 'Jewel'
  | string;

export interface PobItem {
  id: number;
  slot?: ItemSlot;
  rarity: ItemRarity;
  name: string;
  basetype: string;
  itemLevel?: number;
  levelReq?: number;
  quality?: number;
  sockets?: string;
  implicits: ItemMod[];
  explicits: ItemMod[];
  crafted: ItemMod[];
  fractured: ItemMod[];
  enchant: ItemMod[];
  corrupted: boolean;
  influenced?: {
    shaper?: boolean;
    elder?: boolean;
    crusader?: boolean;
    hunter?: boolean;
    redeemer?: boolean;
    warlord?: boolean;
  };
  rawText: string;
}

export interface PobBuild {
  className?: string;
  ascendancyName?: string;
  level?: number;
  items: PobItem[];
  skills?: unknown[];
}
