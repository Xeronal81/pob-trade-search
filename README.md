# PoB Trade Search

A web application that parses Path of Building export codes and generates trade site searches for your equipped items.

## Features

- **Import PoB Codes**: Paste your Path of Building export code to parse and display all equipped items
- **Item Display**: View all items with their mods, influences, and properties styled similar to the game
- **Trade Search Generation**: Generate pathofexile.com/trade searches for each item
- **Mod Selection**: For rare/magic items, select which mods to include in your trade search
- **Category Search**: Option to search by item category (e.g., "Amulet") instead of specific base type
- **Trade Mode Filter**: Choose between Online Only, Online with Buyout, or Any (including offline)
- **Save Builds**: Save your imported builds locally for quick access later
- **League Selection**: Switch between different leagues for trade searches

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pob-trade-search.git
cd pob-trade-search

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. Open Path of Building and load your build
2. Click "Export" -> "Share" -> "Copy to clipboard"
3. Paste the code into the app and click "Import Build"
4. Browse your items and click "Search on Trade Site" to find similar items
5. For rare/magic items, expand the mods section to select specific mods to search for

## Tech Stack

- React 19
- TypeScript
- Vite
- pako (for zlib decompression of PoB codes)

## How It Works

1. **Decoding**: PoB codes are base64-encoded, zlib-compressed XML. The app decodes and decompresses them.
2. **Parsing**: The XML is parsed to extract item data including mods, influences, and properties.
3. **Trade URL Generation**: For each item, a trade site URL is generated with appropriate filters and stat IDs.

## Trade Site Integration

The app generates URLs for the official Path of Exile trade site with:
- Item name/base type filters
- Influence filters (Shaper, Elder, etc.)
- Stat filters for selected mods (mapped to official trade API stat IDs)
- Category filters for generic searches
- Trade mode options (online, buyout, any)

## Disclaimer

Not affiliated with Grinding Gear Games. Path of Exile is a trademark of Grinding Gear Games.

## License

MIT
