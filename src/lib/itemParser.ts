import type { PobItem, PobBuild, ItemRarity, ItemMod } from '../types/pob';

/**
 * Parses the PoB XML and extracts items
 */
export function parseXmlToBuild(xml: string): PobBuild {
  const build: PobBuild = {
    items: [],
  };

  // Extract build info
  const buildMatch = xml.match(/<Build[^>]*>/);
  if (buildMatch) {
    const classMatch = buildMatch[0].match(/className="([^"]+)"/);
    const ascMatch = buildMatch[0].match(/ascendClassName="([^"]+)"/);
    const levelMatch = buildMatch[0].match(/level="([^"]+)"/);
    if (classMatch) build.className = classMatch[1];
    if (ascMatch) build.ascendancyName = ascMatch[1];
    if (levelMatch) build.level = parseInt(levelMatch[1], 10);
  }

  // Extract items section
  const itemsMatch = xml.match(/<Items[^>]*>([\s\S]*?)<\/Items>/);
  if (!itemsMatch) {
    return build;
  }

  const itemsXml = itemsMatch[1];

  // Parse slot assignments - handle various attribute orders
  const slotMap = new Map<number, string>();
  const slotRegex = /<Slot[^>]*name="([^"]+)"[^>]*itemId="(\d+)"[^>]*\/?>/g;
  const slotRegex2 = /<Slot[^>]*itemId="(\d+)"[^>]*name="([^"]+)"[^>]*\/?>/g;

  let slotMatch;
  while ((slotMatch = slotRegex.exec(itemsXml)) !== null) {
    slotMap.set(parseInt(slotMatch[2], 10), slotMatch[1]);
  }
  while ((slotMatch = slotRegex2.exec(itemsXml)) !== null) {
    slotMap.set(parseInt(slotMatch[1], 10), slotMatch[2]);
  }

  // Parse individual items
  const itemRegex = /<Item\s+id="(\d+)"[^>]*>([\s\S]*?)<\/Item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(itemsXml)) !== null) {
    const id = parseInt(itemMatch[1], 10);
    const itemText = itemMatch[2].trim();

    console.log(`\n=== Parsing Item ${id} ===`);
    console.log('Raw text:', itemText.substring(0, 300));

    const parsedItem = parseItemText(itemText, id);
    if (parsedItem) {
      parsedItem.slot = slotMap.get(id);
      console.log('Parsed item:', {
        name: parsedItem.name,
        basetype: parsedItem.basetype,
        rarity: parsedItem.rarity,
        slot: parsedItem.slot,
      });
      build.items.push(parsedItem);
    }
  }

  return build;
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Parses the raw item text from PoB into a structured PobItem
 */
function parseItemText(text: string, id: number): PobItem | null {
  // Decode HTML entities first
  text = decodeHtmlEntities(text);

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length < 2) return null;

  const item: PobItem = {
    id,
    rarity: 'Rare',
    name: '',
    basetype: '',
    implicits: [],
    explicits: [],
    crafted: [],
    fractured: [],
    enchant: [],
    corrupted: false,
    rawText: text,
  };

  let currentSection: 'header' | 'props' | 'implicits' | 'explicits' = 'header';
  let implicitCount = 0;
  let foundRarity = false;
  let nameLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Rarity line (case insensitive, with or without space after colon)
    if (line.toLowerCase().startsWith('rarity:') || line.toLowerCase().startsWith('rarity :')) {
      const rarity = line.split(':')[1]?.trim();
      if (rarity) {
        const normalizedRarity = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
        if (['Normal', 'Magic', 'Rare', 'Unique'].includes(normalizedRarity)) {
          item.rarity = normalizedRarity as ItemRarity;
          foundRarity = true;
          console.log('Found rarity:', item.rarity);
        }
      }
      continue;
    }

    // Check for item name (first line after rarity, or first line if no rarity)
    if (!item.name && (foundRarity || currentSection === 'header')) {
      item.name = line;
      nameLineIndex = i;
      currentSection = 'props';
      console.log('Found name:', item.name);
      continue;
    }

    // Check for basetype (line right after name for rare/unique items)
    // For unique items, this is the base type like "Hubris Circlet"
    if (currentSection === 'props' && !item.basetype && i === nameLineIndex + 1) {
      // Check if this line looks like a base type (no colon except for known properties)
      if (!line.includes(':') || line.startsWith('Two Handed') || line.startsWith('One Handed')) {
        if (!isModLine(line) && !line.startsWith('{')) {
          item.basetype = line;
          console.log('Found basetype:', item.basetype);
          continue;
        }
      }
    }

    // Check for property lines
    if (line.toLowerCase().startsWith('levelreq:')) {
      item.levelReq = parseInt(line.split(':')[1]?.trim() || '0', 10);
      continue;
    }
    if (line.toLowerCase().startsWith('item level:')) {
      item.itemLevel = parseInt(line.split(':')[1]?.trim() || '0', 10);
      continue;
    }
    if (line.toLowerCase().startsWith('quality:')) {
      item.quality = parseInt(line.split(':')[1]?.trim() || '0', 10);
      continue;
    }
    if (line.toLowerCase().startsWith('sockets:')) {
      item.sockets = line.split(':')[1]?.trim();
      continue;
    }
    if (line.toLowerCase().startsWith('implicits:')) {
      implicitCount = parseInt(line.split(':')[1]?.trim() || '0', 10);
      if (implicitCount > 0) {
        currentSection = 'implicits';
      } else {
        // No implicits, go straight to explicits
        currentSection = 'explicits';
      }
      continue;
    }

    // Skip common property lines that aren't mods
    if (isPropertyLine(line)) {
      continue;
    }

    // Skip PoB internal metadata lines
    if (isPobMetadata(line)) {
      continue;
    }

    // Check for influence
    if (line.includes('Shaper Item')) {
      item.influenced = { ...item.influenced, shaper: true };
      continue;
    }
    if (line.includes('Elder Item')) {
      item.influenced = { ...item.influenced, elder: true };
      continue;
    }
    if (line.includes('Crusader Item')) {
      item.influenced = { ...item.influenced, crusader: true };
      continue;
    }
    if (line.includes('Hunter Item')) {
      item.influenced = { ...item.influenced, hunter: true };
      continue;
    }
    if (line.includes('Redeemer Item')) {
      item.influenced = { ...item.influenced, redeemer: true };
      continue;
    }
    if (line.includes('Warlord Item')) {
      item.influenced = { ...item.influenced, warlord: true };
      continue;
    }

    // Check for corrupted
    if (line === 'Corrupted') {
      item.corrupted = true;
      continue;
    }

    // Parse mods
    if (currentSection === 'implicits' && implicitCount > 0) {
      // Handle enchants, implicits
      if (line.startsWith('{crafted}')) {
        item.crafted.push(createItemMod(line));
      } else if (line.startsWith('{fractured}')) {
        item.fractured.push(createItemMod(line));
      } else if (line.startsWith('{enchant}') || line.startsWith('{scourge}')) {
        item.enchant.push(createItemMod(line));
      } else {
        item.implicits.push(createItemMod(line));
      }
      implicitCount--;
      if (implicitCount === 0) {
        currentSection = 'explicits';
      }
      continue;
    }

    // Explicit mods - once we're in explicits section, collect all remaining valid lines
    if (currentSection === 'explicits') {
      if (line.startsWith('{crafted}')) {
        item.crafted.push(createItemMod(line));
      } else if (line.startsWith('{fractured}')) {
        item.fractured.push(createItemMod(line));
      } else {
        // In explicits section, add any line that looks like a mod
        item.explicits.push(createItemMod(line));
      }
      continue;
    }

    // Transition to explicits if we see a mod line while still in props
    if (currentSection === 'props' && isModLine(line)) {
      currentSection = 'explicits';
      if (line.startsWith('{crafted}')) {
        item.crafted.push(createItemMod(line));
      } else if (line.startsWith('{fractured}')) {
        item.fractured.push(createItemMod(line));
      } else {
        item.explicits.push(createItemMod(line));
      }
    }
  }

  // If no basetype was set, use the name
  if (!item.basetype) {
    item.basetype = item.name;
  }

  return item;
}

/**
 * Check if a line is a property line (not a mod)
 */
function isPropertyLine(line: string): boolean {
  const propertyPatterns = [
    /^(Physical|Fire|Cold|Lightning|Chaos) Damage:/i,
    /^Critical Strike Chance:/i,
    /^Attacks per Second:/i,
    /^Weapon Range:/i,
    /^Armour:/i,
    /^Evasion( Rating)?:/i,
    /^Energy Shield:/i,
    /^Ward:/i,
    /^Block( Chance)?:/i,
    /^Chance to Block:/i,
    /^Level:/i,
    /^Requires Level/i,
    /^Requirements:/i,
    /^Str:/i,
    /^Dex:/i,
    /^Int:/i,
    /^Limited to:/i,
    /^Radius:/i,
  ];

  return propertyPatterns.some((pattern) => pattern.test(line));
}

/**
 * Check if a line is PoB internal metadata (not a real mod)
 */
function isPobMetadata(line: string): boolean {
  const metadataPatterns = [
    /^UniqueID:/i,
    /^Unique ID:/i,
    /^ArmourBasePercentile:/i,
    /^EvasionBasePercentile:/i,
    /^EnergyShieldBasePercentile:/i,
    /^WardBasePercentile:/i,
    /^PhysicalDamageBasePercentile:/i,
    /^ElementalDamageBasePercentile:/i,
    /^ChaosDamageBasePercentile:/i,
    /^CritChanceBasePercentile:/i,
    /^AttackSpeedBasePercentile:/i,
    /^BasePercentile:/i,
    /^Variant:/i,
    /^Selected Variant:/i,
    /^Has Alt Variant:/i,
    /^Has Variant:/i,
    /^League:/i,
    /^Source:/i,
    /^Crafted:/i,
    /^Prefix:/i,
    /^Suffix:/i,
    /^Catalyst:/i,
    /^CatalystQuality:/i,
    /^LevelReq:/i,
    /^ItemLevel:/i,
    /^Item Level:/i,
    /^Quality:/i,
    /^Sockets:/i,
    /^Implicits:/i,
    /^Rarity:/i,
    /^[A-Za-z]+Percentile:/i, // Catch any other percentile metadata
  ];

  return metadataPatterns.some((pattern) => pattern.test(line));
}

/**
 * Check if a line looks like a modifier
 */
function isModLine(line: string): boolean {
  // Skip property lines
  if (isPropertyLine(line)) return false;

  // Skip PoB metadata
  if (isPobMetadata(line)) return false;

  // Mods often have numbers, percentages, or start with + or -
  // Also check for common mod patterns
  return (
    /(\d+%?|^\+|^-)/.test(line) ||
    line.startsWith('{') ||
    line.includes('increased') ||
    line.includes('reduced') ||
    line.includes('more') ||
    line.includes('less') ||
    line.includes('added') ||
    line.includes('to ') ||
    line.includes('with ')
  );
}

/**
 * Clean the raw mod line by removing PoB-specific tags
 */
function cleanRawMod(line: string): string {
  return line
    // Remove leading tags like {crafted}, {fractured}, etc.
    .replace(/^\{[^}]+\}/, '')
    // Remove inline tags
    .replace(/\{[^}]*\}/g, '')
    // Remove XML-like ModRange tags and similar - these are PoB internal markup
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Create a display version of a mod - keeps actual values for display
 * (Just returns the original cleaned text as-is)
 */
function createDisplayMod(original: string): string {
  // Display the actual values - no transformation needed
  return original;
}

/**
 * Create an ItemMod with both display and original text
 */
function createItemMod(line: string): ItemMod {
  const original = cleanRawMod(line);
  const display = createDisplayMod(original);
  return { display, original };
}
