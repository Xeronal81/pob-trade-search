import { useState } from 'react';
import { SavedBuilds } from './SavedBuilds';

interface PobInputProps {
  onDecode: (code: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function PobInput({ onDecode, isLoading, error }: PobInputProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onDecode(code.trim());
    }
  };

  const handleSelectSavedBuild = (savedCode: string) => {
    setCode(savedCode);
    onDecode(savedCode);
  };

  return (
    <div className="pob-input">
      <h2>Import Path of Building Code</h2>
      <p className="instructions">
        Paste your Path of Building export code below. You can get this from PoB by clicking
        "Export" → "Share" → "Copy to clipboard".
      </p>

      <SavedBuilds onSelectBuild={handleSelectSavedBuild} />

      <form onSubmit={handleSubmit}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your PoB code here..."
          rows={6}
          disabled={isLoading}
        />

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={isLoading || !code.trim()}>
          {isLoading ? 'Decoding...' : 'Import Build'}
        </button>
      </form>
    </div>
  );
}
