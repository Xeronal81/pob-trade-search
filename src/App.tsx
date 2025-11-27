import { useState } from 'react';
import { PobInput } from './components/PobInput';
import { ItemList } from './components/ItemList';
import { decodePobCode, isValidPobCode } from './lib/pobDecoder';
import { parseXmlToBuild } from './lib/itemParser';
import type { PobBuild } from './types/pob';
import './App.css';

function App() {
  const [build, setBuild] = useState<PobBuild | null>(null);
  const [pobCode, setPobCode] = useState<string | null>(null);
  const [league, setLeague] = useState('Phrecia');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecode = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Input code length:', code.length);
      console.log('First 100 chars:', code.substring(0, 100));

      if (!isValidPobCode(code)) {
        throw new Error('Invalid PoB code format. Please paste a valid Path of Building export code.');
      }

      console.log('Code validation passed, attempting decode...');
      const xml = decodePobCode(code);
      console.log('Decoded XML length:', xml.length);
      console.log('XML preview:', xml.substring(0, 500));

      const parsedBuild = parseXmlToBuild(xml);
      console.log('Parsed build:', parsedBuild);

      if (parsedBuild.items.length === 0) {
        throw new Error('No items found in the build. Make sure you exported a build with equipped items.');
      }

      setBuild(parsedBuild);
      setPobCode(code);
    } catch (err) {
      console.error('Decode error:', err);
      setError(err instanceof Error ? err.message : 'Failed to decode PoB code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setBuild(null);
    setPobCode(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>PoB Trade Search</h1>
        <p>Import your Path of Building code and search for items on the trade site</p>
      </header>

      <main className="app-main">
        {!build ? (
          <PobInput onDecode={handleDecode} isLoading={isLoading} error={error} />
        ) : (
          <ItemList
            items={build.items}
            league={league}
            onLeagueChange={setLeague}
            onReset={handleReset}
            buildInfo={{
              className: build.className,
              ascendancyName: build.ascendancyName,
              level: build.level,
            }}
            pobCode={pobCode || undefined}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Not affiliated with Grinding Gear Games.
          Path of Exile is a trademark of Grinding Gear Games.
        </p>
      </footer>
    </div>
  );
}

export default App;
