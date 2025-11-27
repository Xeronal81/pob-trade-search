import { useState } from 'react';
import type { PobItem, ItemMod } from '../types/pob';
import { getSlotDisplayName, getRarityColor } from '../lib/tradeUrl';

interface ItemCardProps {
  item: PobItem;
  league: string;
  tradeMode: 'online' | 'onlineleague' | 'any';
}

/**
 * Map item slots and base types to trade site category filters
 */
const SLOT_TO_CATEGORY: Record<string, { category: string; filters?: Record<string, unknown> }> = {
  'Amulet': { category: 'accessory', filters: { type_filters: { filters: { category: { option: 'accessory.amulet' } } } } },
  'Ring 1': { category: 'accessory', filters: { type_filters: { filters: { category: { option: 'accessory.ring' } } } } },
  'Ring 2': { category: 'accessory', filters: { type_filters: { filters: { category: { option: 'accessory.ring' } } } } },
  'Belt': { category: 'accessory', filters: { type_filters: { filters: { category: { option: 'accessory.belt' } } } } },
  'Helmet': { category: 'armour', filters: { type_filters: { filters: { category: { option: 'armour.helmet' } } } } },
  'Body Armour': { category: 'armour', filters: { type_filters: { filters: { category: { option: 'armour.chest' } } } } },
  'Gloves': { category: 'armour', filters: { type_filters: { filters: { category: { option: 'armour.gloves' } } } } },
  'Boots': { category: 'armour', filters: { type_filters: { filters: { category: { option: 'armour.boots' } } } } },
  'Weapon 1': { category: 'weapon' },
  'Weapon 2': { category: 'weapon' },
  'Weapon 1 Swap': { category: 'weapon' },
  'Weapon 2 Swap': { category: 'weapon' },
};

/**
 * Get the category display name for UI
 */
function getCategoryDisplayName(slot: string | undefined): string | null {
  if (!slot) return null;

  const slotLower = slot.toLowerCase();
  if (slotLower.includes('amulet')) return 'Amulet';
  if (slotLower.includes('ring')) return 'Ring';
  if (slotLower.includes('belt')) return 'Belt';
  if (slotLower.includes('helmet')) return 'Helmet';
  if (slotLower.includes('body')) return 'Body Armour';
  if (slotLower.includes('gloves')) return 'Gloves';
  if (slotLower.includes('boots')) return 'Boots';
  if (slotLower.includes('weapon')) return 'Weapon';

  return null;
}

/**
 * Generate trade URL for the item with selected mods
 */
function generateTradeUrlWithMods(
  item: PobItem,
  league: string,
  selectedMods: Set<ItemMod>,
  useCategory: boolean,
  tradeMode: 'online' | 'onlineleague' | 'any'
): string {
  const query: Record<string, unknown> = {
    query: {
      status: { option: tradeMode },
      filters: {},
    },
    sort: { price: 'asc' },
  };

  // For unique items, search by name
  if (item.rarity === 'Unique') {
    (query.query as Record<string, unknown>).name = item.name;
    if (item.basetype && item.basetype !== item.name) {
      (query.query as Record<string, unknown>).type = item.basetype;
    }
  } else if (useCategory && item.slot && SLOT_TO_CATEGORY[item.slot]) {
    // Search by category instead of specific base type
    const categoryInfo = SLOT_TO_CATEGORY[item.slot];
    if (categoryInfo.filters) {
      (query.query as Record<string, unknown>).filters = {
        ...((query.query as Record<string, unknown>).filters as Record<string, unknown>),
        ...categoryInfo.filters,
      };
    }
  } else {
    // For rare/magic items, search by base type
    if (item.basetype) {
      (query.query as Record<string, unknown>).type = item.basetype;
    }
  }

  // Add influence filters
  if (item.influenced) {
    const miscFilters: Record<string, unknown> = {};
    if (item.influenced.shaper) miscFilters.shaper_item = { option: true };
    if (item.influenced.elder) miscFilters.elder_item = { option: true };
    if (item.influenced.crusader) miscFilters.crusader_item = { option: true };
    if (item.influenced.hunter) miscFilters.hunter_item = { option: true };
    if (item.influenced.redeemer) miscFilters.redeemer_item = { option: true };
    if (item.influenced.warlord) miscFilters.warlord_item = { option: true };

    if (Object.keys(miscFilters).length > 0) {
      ((query.query as Record<string, unknown>).filters as Record<string, unknown>).misc_filters = {
        filters: miscFilters,
      };
    }
  }

  // Add stat filters for selected mods
  // The trade site uses pseudo stats and explicit stats
  // We send the mod type without specific values - user can refine on trade site
  if (selectedMods.size > 0 && item.rarity !== 'Unique') {
    const statFilters: Array<{ id: string }> = [];

    selectedMods.forEach((mod) => {
      // Try to identify common stat patterns (use original text for matching)
      const statId = identifyStatId(mod.original);
      if (statId) {
        // Just add the stat type, no min/max values
        statFilters.push({ id: statId });
      }
    });

    if (statFilters.length > 0) {
      (query.query as Record<string, unknown>).stats = [
        {
          type: 'and',
          filters: statFilters,
        },
      ];
    }
  }

  const encodedQuery = encodeURIComponent(JSON.stringify(query));
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodedQuery}`;
}

/**
 * Try to identify the trade API stat ID from mod text
 * This is a simplified mapping - a full implementation would need the complete stat database
 * Note: Mod text may have # placeholders instead of actual values
 * IMPORTANT: More specific patterns must be checked BEFORE generic ones
 *
 * Trade API stat ID reference:
 * - explicit.stat_xxx = explicit mods
 * - implicit.stat_xxx = implicit mods
 * - pseudo.pseudo_xxx = pseudo (combined) stats
 */
function identifyStatId(mod: string): string | null {
  const modLower = mod.toLowerCase();

  // === LIFE ON KILL/HIT - Check BEFORE "maximum life" ===
  // Use explicit stat IDs for life on kill
  if (modLower.includes('life per enemy killed') || modLower.includes('life gained on kill') ||
      (modLower.includes('gain') && modLower.includes('life') && modLower.includes('kill')))
    return 'explicit.stat_3695891184'; // +# Life gained on Kill
  if (modLower.includes('life gained on hit') || modLower.includes('life gain on hit') ||
      modLower.includes('life gained for each enemy hit'))
    return 'explicit.stat_3593843976'; // +# Life gained for each Enemy hit by Attacks

  // === COMBINED ATTRIBUTES - Use explicit stat IDs for dual attributes ===
  if (modLower.includes('to all attributes') || modLower.includes('all attributes'))
    return 'pseudo.pseudo_total_all_attributes';
  if (modLower.includes('strength and dexterity'))
    return 'explicit.stat_538848803'; // +# to Strength and Dexterity
  if (modLower.includes('strength and intelligence'))
    return 'explicit.stat_1535626285'; // +# to Strength and Intelligence
  if (modLower.includes('dexterity and intelligence'))
    return 'explicit.stat_2300185227'; // +# to Dexterity and Intelligence

  // === MAXIMUM LIFE/MANA/ES - Standard stats ===
  if (modLower.includes('maximum life') ||
      (modLower.includes('to life') && !modLower.includes('kill') && !modLower.includes('hit') && !modLower.includes('leech')))
    return 'pseudo.pseudo_total_life';
  if (modLower.includes('maximum mana') || modLower.includes('to mana'))
    return 'pseudo.pseudo_total_mana';
  if (modLower.includes('maximum energy shield') || modLower.includes('to energy shield'))
    return 'pseudo.pseudo_total_energy_shield';

  // === SINGLE ATTRIBUTES ===
  if (modLower.includes('to strength') && !modLower.includes('and dexterity') && !modLower.includes('and intelligence'))
    return 'pseudo.pseudo_total_strength';
  if (modLower.includes('to dexterity') && !modLower.includes('and strength') && !modLower.includes('and intelligence'))
    return 'pseudo.pseudo_total_dexterity';
  if (modLower.includes('to intelligence') && !modLower.includes('and strength') && !modLower.includes('and dexterity'))
    return 'pseudo.pseudo_total_intelligence';

  // === RESISTANCES ===
  if (modLower.includes('to all elemental resistances') || modLower.includes('all elemental resistances'))
    return 'pseudo.pseudo_total_elemental_resistance';
  if (modLower.includes('fire resistance') && !modLower.includes('and cold') && !modLower.includes('and lightning'))
    return 'pseudo.pseudo_total_fire_resistance';
  if (modLower.includes('cold resistance') && !modLower.includes('and fire') && !modLower.includes('and lightning'))
    return 'pseudo.pseudo_total_cold_resistance';
  if (modLower.includes('lightning resistance') && !modLower.includes('and fire') && !modLower.includes('and cold'))
    return 'pseudo.pseudo_total_lightning_resistance';
  if (modLower.includes('chaos resistance'))
    return 'pseudo.pseudo_total_chaos_resistance';
  // Combined resistances (fire and cold, etc.)
  if (modLower.includes('fire and cold resistance'))
    return 'explicit.stat_3441501978'; // +#% to Fire and Cold Resistances
  if (modLower.includes('fire and lightning resistance'))
    return 'explicit.stat_2915988346'; // +#% to Fire and Lightning Resistances
  if (modLower.includes('cold and lightning resistance'))
    return 'explicit.stat_4277795662'; // +#% to Cold and Lightning Resistances

  // === ADDED DAMAGE ===
  // Check for "to Attacks" variants first (more specific)
  if (modLower.includes('adds') && modLower.includes('physical damage') && modLower.includes('to attacks'))
    return 'explicit.stat_3032590688'; // Adds # to # Physical Damage to Attacks
  if (modLower.includes('adds') && modLower.includes('fire damage') && modLower.includes('to attacks'))
    return 'explicit.stat_1573130764'; // Adds # to # Fire Damage to Attacks
  if (modLower.includes('adds') && modLower.includes('cold damage') && modLower.includes('to attacks'))
    return 'explicit.stat_4067062424'; // Adds # to # Cold Damage to Attacks
  if (modLower.includes('adds') && modLower.includes('lightning damage') && modLower.includes('to attacks'))
    return 'explicit.stat_1754445556'; // Adds # to # Lightning Damage to Attacks
  if (modLower.includes('adds') && modLower.includes('chaos damage') && modLower.includes('to attacks'))
    return 'explicit.stat_674553446'; // Adds # to # Chaos Damage to Attacks

  // Check for "to Spells" variants
  if (modLower.includes('adds') && modLower.includes('fire damage') && modLower.includes('to spells'))
    return 'explicit.stat_2231156303'; // Adds # to # Fire Damage to Spells
  if (modLower.includes('adds') && modLower.includes('cold damage') && modLower.includes('to spells'))
    return 'explicit.stat_2469416729'; // Adds # to # Cold Damage to Spells
  if (modLower.includes('adds') && modLower.includes('lightning damage') && modLower.includes('to spells'))
    return 'explicit.stat_2831165374'; // Adds # to # Lightning Damage to Spells
  if (modLower.includes('adds') && modLower.includes('chaos damage') && modLower.includes('to spells'))
    return 'explicit.stat_1011413412'; // Adds # to # Chaos Damage to Spells

  // Generic added damage (fallback for weapons, etc.)
  if (modLower.includes('adds') && modLower.includes('physical damage'))
    return 'pseudo.pseudo_adds_physical_damage';
  if (modLower.includes('adds') && modLower.includes('fire damage'))
    return 'pseudo.pseudo_adds_fire_damage';
  if (modLower.includes('adds') && modLower.includes('cold damage'))
    return 'pseudo.pseudo_adds_cold_damage';
  if (modLower.includes('adds') && modLower.includes('lightning damage'))
    return 'pseudo.pseudo_adds_lightning_damage';
  if (modLower.includes('adds') && modLower.includes('chaos damage'))
    return 'pseudo.pseudo_adds_chaos_damage';

  // === CRITICAL ===
  if (modLower.includes('critical strike chance'))
    return 'pseudo.pseudo_critical_strike_chance';
  if (modLower.includes('critical strike multiplier'))
    return 'pseudo.pseudo_critical_strike_multiplier';

  // === SPEED ===
  if (modLower.includes('attack speed'))
    return 'pseudo.pseudo_increased_attack_speed';
  if (modLower.includes('cast speed'))
    return 'pseudo.pseudo_increased_cast_speed';
  if (modLower.includes('movement speed'))
    return 'pseudo.pseudo_increased_movement_speed';

  // === ACCURACY ===
  if (modLower.includes('accuracy rating') || modLower.includes('to accuracy'))
    return 'pseudo.pseudo_total_accuracy_rating';

  // === MANA ===
  if (modLower.includes('mana regeneration'))
    return 'pseudo.pseudo_increased_mana_regen';

  // Return null for mods we can't identify
  return null;
}

export function ItemCard({ item, league, tradeMode }: ItemCardProps) {
  const [selectedMods, setSelectedMods] = useState<Set<ItemMod>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [useCategory, setUseCategory] = useState(false);
  const rarityColor = getRarityColor(item.rarity);

  const allMods = [
    ...item.implicits.map((m) => ({ mod: m, type: 'implicit' as const })),
    ...item.explicits.map((m) => ({ mod: m, type: 'explicit' as const })),
    ...item.crafted.map((m) => ({ mod: m, type: 'crafted' as const })),
    ...item.fractured.map((m) => ({ mod: m, type: 'fractured' as const })),
  ];

  const handleModToggle = (mod: ItemMod) => {
    const newSelected = new Set(selectedMods);
    if (newSelected.has(mod)) {
      newSelected.delete(mod);
    } else {
      newSelected.add(mod);
    }
    setSelectedMods(newSelected);
  };

  const handleSearchClick = () => {
    const tradeUrl = generateTradeUrlWithMods(item, league, selectedMods, useCategory, tradeMode);
    window.open(tradeUrl, '_blank', 'noopener,noreferrer');
  };

  const categoryName = getCategoryDisplayName(item.slot);
  const canUseCategory = item.rarity !== 'Unique' && categoryName && item.slot && SLOT_TO_CATEGORY[item.slot];

  const handleSelectAll = () => {
    const identifiableMods = allMods.filter(({ mod }) => identifyStatId(mod.original) !== null);
    setSelectedMods(new Set(identifiableMods.map(({ mod }) => mod)));
  };

  const handleClearAll = () => {
    setSelectedMods(new Set());
  };

  const isRareOrMagic = item.rarity === 'Rare' || item.rarity === 'Magic';

  return (
    <div className="item-card" style={{ borderColor: rarityColor }}>
      <div className="item-header">
        <span className="item-slot">{getSlotDisplayName(item.slot)}</span>
        <span className="item-rarity" style={{ color: rarityColor }}>
          {item.rarity}
        </span>
      </div>

      <h3 className="item-name" style={{ color: rarityColor }}>
        {item.name}
      </h3>

      {item.basetype !== item.name && <div className="item-basetype">{item.basetype}</div>}

      <div className="item-details">
        {item.itemLevel && <span className="item-detail">iLvl: {item.itemLevel}</span>}
        {item.quality && item.quality > 0 && (
          <span className="item-detail">Quality: {item.quality}%</span>
        )}
        {item.sockets && <span className="item-detail">Sockets: {item.sockets}</span>}
      </div>

      {item.influenced && Object.keys(item.influenced).length > 0 && (
        <div className="item-influences">
          {item.influenced.shaper && <span className="influence shaper">Shaper</span>}
          {item.influenced.elder && <span className="influence elder">Elder</span>}
          {item.influenced.crusader && <span className="influence crusader">Crusader</span>}
          {item.influenced.hunter && <span className="influence hunter">Hunter</span>}
          {item.influenced.redeemer && <span className="influence redeemer">Redeemer</span>}
          {item.influenced.warlord && <span className="influence warlord">Warlord</span>}
        </div>
      )}

      {item.enchant.length > 0 && (
        <div className="item-mods enchants">
          {item.enchant.map((mod, i) => (
            <div key={i} className="mod enchant">
              {mod.display}
            </div>
          ))}
        </div>
      )}

      {/* Expandable mods section for rare/magic items */}
      {isRareOrMagic && allMods.length > 0 && (
        <div className="mods-section">
          <button
            className="expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            {isExpanded ? '▼' : '▶'} {allMods.length} mods {selectedMods.size > 0 && `(${selectedMods.size} selected)`}
          </button>

          {isExpanded && (
            <div className="mods-list">
              <div className="mods-actions">
                <button type="button" onClick={handleSelectAll} className="mod-action-btn">
                  Select Searchable
                </button>
                <button type="button" onClick={handleClearAll} className="mod-action-btn">
                  Clear All
                </button>
              </div>

              {allMods.map(({ mod, type }, i) => {
                const isSearchable = identifyStatId(mod.original) !== null;
                return (
                  <label
                    key={i}
                    className={`mod-checkbox ${type} ${!isSearchable ? 'not-searchable' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMods.has(mod)}
                      onChange={() => handleModToggle(mod)}
                      disabled={!isSearchable}
                    />
                    <span className={`mod ${type}`}>{mod.display}</span>
                    {!isSearchable && <span className="mod-hint">(manual search)</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Show mods directly for unique items */}
      {!isRareOrMagic && (
        <>
          {item.implicits.length > 0 && (
            <div className="item-mods implicits">
              {item.implicits.map((mod, i) => (
                <div key={i} className="mod implicit">
                  {mod.display}
                </div>
              ))}
            </div>
          )}

          {item.explicits.length > 0 && (
            <div className="item-mods explicits">
              {item.explicits.map((mod, i) => (
                <div key={i} className="mod explicit">
                  {mod.display}
                </div>
              ))}
            </div>
          )}

          {item.crafted.length > 0 && (
            <div className="item-mods crafted-mods">
              {item.crafted.map((mod, i) => (
                <div key={i} className="mod crafted">
                  {mod.display}
                </div>
              ))}
            </div>
          )}

          {item.fractured.length > 0 && (
            <div className="item-mods fractured-mods">
              {item.fractured.map((mod, i) => (
                <div key={i} className="mod fractured">
                  {mod.display}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {item.corrupted && <div className="item-corrupted">Corrupted</div>}

      {canUseCategory && (
        <label className="category-toggle">
          <input
            type="checkbox"
            checked={useCategory}
            onChange={(e) => setUseCategory(e.target.checked)}
          />
          <span>Search as "{categoryName}" (ignore base type)</span>
        </label>
      )}

      <button className="search-button" onClick={handleSearchClick}>
        Search on Trade Site
        {isRareOrMagic && selectedMods.size > 0 && ` (${selectedMods.size} mods)`}
      </button>
    </div>
  );
}
