// SHA-256 of the curator's sync passphrase — the single shared identity for
// both the public "Curated Picks" feed (api/feed.ts) and the on-site "Don't
// miss" lede (CuratorPicks). Whatever the curator stars under this passphrase
// becomes the public curation. The hash is one-way; the passphrase itself
// stays only with the curator.
export const CURATOR_HASH =
  "a0bca4aafe518805cd71df84152a5a316bb186c9b1f69bdb071ed8c494b7f65a";
