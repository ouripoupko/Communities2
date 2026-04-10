import { contractRead, contractWrite, deployContract } from '../services/api';
import type { IMethod } from '../services/interfaces';
import initiativeContractCode from '../assets/contracts/initiative_contract.py?raw';

interface SeedInitiative {
  title: string;
  description: string;
  stage: string;
  countries: string[];
  evidence: string[];
}

const SEED_INITIATIVES: SeedInitiative[] = [
  {
    title: 'Global Water Access Crisis',
    description: 'Over 2 billion people worldwide lack access to safely managed drinking water. This affects health, education, and economic development across multiple countries and requires coordinated global action.',
    stage: 'problem',
    countries: ['KE', 'NG', 'IN', 'BD'],
    evidence: ['https://www.who.int/news-room/fact-sheets/detail/drinking-water'],
  },
  {
    title: 'Misinformation & Democratic Integrity',
    description: 'AI-generated misinformation is undermining democratic processes globally. Voters are being manipulated and public trust in institutions is declining rapidly across borders.',
    stage: 'discussion',
    countries: ['US', 'BR', 'PH', 'NG', 'DE'],
    evidence: [],
  },
  {
    title: 'Youth Employment & Education',
    description: 'Youth unemployment rates exceed 30% in many countries. Millions of young people face economic exclusion, leading to social instability and brain drain from developing nations.',
    stage: 'proposals',
    countries: ['KE', 'ZA', 'ES', 'GR', 'EG'],
    evidence: [],
  },
  {
    title: 'Digital Privacy Standards',
    description: 'Personal data is harvested at an unprecedented scale with minimal regulation in most countries. A global framework for digital rights is urgently needed to protect citizens worldwide.',
    stage: 'vote',
    countries: ['DE', 'FR', 'US', 'JP', 'BR', 'IN'],
    evidence: [],
  },
  {
    title: 'Universal Climate Adaptation Fund',
    description: 'Communities worldwide need a decentralized climate adaptation fund. Local communities can apply directly for resilience infrastructure and disaster preparedness resources.',
    stage: 'mandate',
    countries: ['MW', 'BD', 'PH', 'MX', 'KE', 'FJ'],
    evidence: [],
  },
];

const SEED_STORAGE_KEY = 'gloki_test_data_seeded';
const TEST_SEEDING_FLAG = 'gloki_enable_test_seeding';
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const STAGE_ORDER = ['problem', 'discussion', 'proposals', 'vote', 'mandate'] as const;

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.includes(hostname);
}

function isSafeSeedEnvironment(serverUrl: string): boolean {
  if (!import.meta.env.DEV) return false;

  try {
    const serverHost = new URL(serverUrl).hostname;
    const appHost = window.location.hostname;
    const seedingEnabled = import.meta.env.VITE_ENABLE_TEST_SEEDING === 'true'
      || localStorage.getItem(TEST_SEEDING_FLAG) === 'true';

    return seedingEnabled && isLocalHost(serverHost) && isLocalHost(appHost);
  } catch {
    return false;
  }
}

async function advanceInitiativeToStage(
  serverUrl: string,
  publicKey: string,
  initiativeId: string,
  targetStage: string,
): Promise<void> {
  const targetIndex = STAGE_ORDER.indexOf(targetStage as typeof STAGE_ORDER[number]);
  if (targetIndex <= 0) return;

  for (let i = 1; i <= targetIndex; i += 1) {
    await contractWrite({
      serverUrl,
      publicKey,
      contractId: initiativeId,
      method: { name: 'set_stage', values: { stage: STAGE_ORDER[i] } } as IMethod,
    });
  }
}

export async function seedTestDataIfNeeded(
  serverUrl: string,
  publicKey: string,
  communityId: string,
  communityName: string,
): Promise<void> {
  if (!isSafeSeedEnvironment(serverUrl)) return;

  // Only seed for communities with "test" in their name
  if (!communityName.toLowerCase().includes('test')) return;

  // Check if already seeded
  const seededKey = `${SEED_STORAGE_KEY}_${communityId}`;
  if (localStorage.getItem(seededKey)) return;

  console.log('[SeedData] Seeding test initiatives for', communityName);

  try {
    // Check if community already has initiatives
    const existingCollabs = await contractRead({
      serverUrl, publicKey, contractId: communityId,
      method: { name: 'get_collaborations', values: {} } as IMethod,
    });

    const existingList = Array.isArray(existingCollabs) ? existingCollabs : [];
    const hasInitiatives = existingList.some((c: { type?: string }) => c.type === 'initiative');
    if (hasInitiatives) {
      localStorage.setItem(seededKey, 'true');
      return;
    }

    // Deploy each test initiative
    for (const seed of SEED_INITIATIVES) {
      try {
        const response = await deployContract({
          serverUrl, publicKey,
          name: `initiative_${seed.title.toLowerCase().replace(/\s+/g, '_').slice(0, 20)}`,
          contract: 'initiative_contract.py',
          code: initiativeContractCode,
        });

        // deployContract returns an object with an `id` field, or a plain string ID
        const initiativeId = (response as { id?: string }).id || (response as string);
        if (!initiativeId) {
          console.error('[SeedData] No contract ID returned for', seed.title);
          continue;
        }

        // Set details
        await contractWrite({
          serverUrl, publicKey, contractId: initiativeId,
          method: {
            name: 'set_details',
            values: {
              details: {
                title: seed.title,
                description: seed.description,
                countries: seed.countries,
                evidence: seed.evidence,
              },
            },
          } as IMethod,
        });

        // Advance sequentially so seeding follows the same stage rules as the UI.
        await advanceInitiativeToStage(serverUrl, publicKey, initiativeId, seed.stage);

        // Register with community
        await contractWrite({
          serverUrl, publicKey, contractId: communityId,
          method: {
            name: 'add_collaboration',
            values: {
              collaboration: {
                id: initiativeId,
                type: 'initiative',
                title: seed.title,
                description: seed.description,
                author: publicKey,
                createdAt: Date.now(),
              },
            },
          } as IMethod,
        });

        console.log(`[SeedData] Created initiative: ${seed.title} at stage ${seed.stage}`);
      } catch (err) {
        console.error(`[SeedData] Failed to create ${seed.title}:`, err);
      }
    }

    localStorage.setItem(seededKey, 'true');
    console.log('[SeedData] Test data seeding complete');
  } catch (err) {
    console.error('[SeedData] Failed to seed test data:', err);
  }
}
