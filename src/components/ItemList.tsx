import { useState } from 'react';
import type { PobItem } from '../types/pob';
import { ItemCard } from './ItemCard';
import { LEAGUES } from '../lib/tradeUrl';
import { saveBuild } from '../lib/buildStorage';

interface ItemListProps {
  items: PobItem[];
  league: string;
  onLeagueChange: (league: string) => void;
  onReset: () => void;
  buildInfo?: {
    className?: string;
    ascendancyName?: string;
    level?: number;
  };
  pobCode?: string;
}

// Group items by slot category
const SLOT_ORDER = [
  'Helmet',
  'Amulet',
  'Body Armour',
  'Weapon 1',
  'Weapon 2',
  'Gloves',
  'Ring 1',
  'Ring 2',
  'Belt',
  'Boots',
  'Flask 1',
  'Flask 2',
  'Flask 3',
  'Flask 4',
  'Flask 5',
  'Weapon 1 Swap',
  'Weapon 2 Swap',
];

export function ItemList({ items, league, onLeagueChange, onReset, buildInfo, pobCode }: ItemListProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [buildName, setBuildName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tradeMode, setTradeMode] = useState<'online' | 'onlineleague' | 'any'>('online');

  // Sort items by slot order
  const sortedItems = [...items].sort((a, b) => {
    const aIndex = a.slot ? SLOT_ORDER.indexOf(a.slot) : 999;
    const bIndex = b.slot ? SLOT_ORDER.indexOf(b.slot) : 999;
    return aIndex - bIndex;
  });

  // Filter out items without slots (like jewels in passive tree)
  const equippedItems = sortedItems.filter(item => item.slot);
  const otherItems = sortedItems.filter(item => !item.slot);

  const handleSaveBuild = () => {
    if (!pobCode || !buildName.trim()) return;

    setSaveStatus('saving');
    saveBuild(buildName.trim(), pobCode, buildInfo);
    setSaveStatus('saved');
    setShowSaveDialog(false);
    setBuildName('');

    // Reset status after a delay
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const defaultBuildName = buildInfo?.ascendancyName || buildInfo?.className || 'My Build';

  return (
    <div className="item-list">
      <div className="list-header">
        <div className="build-info">
          {buildInfo && (
            <h2>
              {buildInfo.ascendancyName || buildInfo.className}
              {buildInfo.level && ` (Level ${buildInfo.level})`}
            </h2>
          )}
          <p>{equippedItems.length} equipped items found</p>
        </div>

        <div className="list-controls">
          <label>
            League:
            <select value={league} onChange={(e) => onLeagueChange(e.target.value)}>
              {LEAGUES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>

          <label>
            Trade Mode:
            <select value={tradeMode} onChange={(e) => setTradeMode(e.target.value as 'online' | 'onlineleague' | 'any')}>
              <option value="online">Online Only</option>
              <option value="onlineleague">Online (Buyout)</option>
              <option value="any">Any (Offline too)</option>
            </select>
          </label>

          {pobCode && (
            <>
              {showSaveDialog ? (
                <div className="save-dialog">
                  <input
                    type="text"
                    placeholder="Build name..."
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBuild();
                      if (e.key === 'Escape') setShowSaveDialog(false);
                    }}
                    autoFocus
                  />
                  <button onClick={handleSaveBuild} disabled={!buildName.trim()}>
                    Save
                  </button>
                  <button onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="save-button"
                  onClick={() => {
                    setBuildName(defaultBuildName);
                    setShowSaveDialog(true);
                  }}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saved' ? 'Saved!' : 'Save Build'}
                </button>
              )}
            </>
          )}

          <button className="reset-button" onClick={onReset}>
            Import New Build
          </button>
        </div>
      </div>

      <div className="items-grid">
        {equippedItems.map((item) => (
          <ItemCard key={item.id} item={item} league={league} tradeMode={tradeMode} />
        ))}
      </div>

      {otherItems.length > 0 && (
        <>
          <h3 className="section-title">Other Items (Jewels, etc.)</h3>
          <div className="items-grid">
            {otherItems.map((item) => (
              <ItemCard key={item.id} item={item} league={league} tradeMode={tradeMode} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
