import pako from 'pako';

/**
 * Decodes a Path of Building export code to XML string.
 *
 * PoB codes are:
 * 1. XML data
 * 2. Compressed with zlib deflate
 * 3. Encoded as base64
 * 4. URL-safe character replacements: + -> -, / -> _
 */
export function decodePobCode(code: string): string {
  // Remove whitespace and newlines
  let cleaned = code.trim().replace(/\s+/g, '');

  // Reverse URL-safe character replacements
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (cleaned.length % 4 !== 0) {
    cleaned += '=';
  }

  // Decode base64 to binary
  let binaryString: string;
  try {
    binaryString = atob(cleaned);
  } catch (e) {
    throw new Error('Invalid base64 encoding in PoB code');
  }

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Try different decompression methods
  let decompressed: Uint8Array;

  // First try inflateRaw (raw deflate without zlib header)
  try {
    decompressed = pako.inflateRaw(bytes);
  } catch {
    // If that fails, try regular inflate (with zlib header)
    try {
      decompressed = pako.inflate(bytes);
    } catch {
      // Last resort: try ungzip
      try {
        decompressed = pako.ungzip(bytes);
      } catch {
        throw new Error('Failed to decompress PoB code. The data may be corrupted.');
      }
    }
  }

  // Convert to string
  const decoder = new TextDecoder('utf-8');
  const xml = decoder.decode(decompressed);

  // Validate that we got XML
  if (!xml.includes('<?xml') && !xml.includes('<PathOfBuilding')) {
    throw new Error('Decoded data does not appear to be valid PoB XML');
  }

  return xml;
}

/**
 * Validates if a string looks like a PoB code
 */
export function isValidPobCode(code: string): boolean {
  const cleaned = code.trim().replace(/\s+/g, '');
  // PoB codes are typically long base64 strings
  // Allow URL-safe base64 characters
  // Minimum length reduced to allow shorter builds
  return /^[A-Za-z0-9+/=_-]+$/.test(cleaned) && cleaned.length > 50;
}
