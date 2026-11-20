import type { Sources } from '../ibc';

// The contracts' Solidity sources, as ibc takes them: files by path. Most
// contracts are one file; the community is the files of contracts/community/,
// which import each other by these paths. Joiners send the same files, so
// their node compiles exactly what was deployed.

const singleFiles = import.meta.glob('../../assets/contracts/*.sol', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const communityFiles = import.meta.glob('../../assets/contracts/community/*.sol', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** A one-file contract's source, by its file's name (e.g. 'Profile.sol'). */
export function sourceOf(file: string): Sources {
  const text = singleFiles[`../../assets/contracts/${file}`];
  if (text === undefined) throw new Error(`No contract source ${file}`);
  return { [file]: text };
}

/** The community's source: its files. */
export const communitySource: Sources = Object.fromEntries(
  Object.entries(communityFiles).map(([path, text]) => [fileName(path), text]),
);

/** The contract in the community's source that ibc deploys and joins. */
export const COMMUNITY_CONTRACT = 'Community';
