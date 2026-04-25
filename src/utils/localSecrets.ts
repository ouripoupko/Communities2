import type { IProfile } from '../services/interfaces';

const OPENAI_API_KEY_PREFIX = 'gloki_local_openai_api_key';

function getScopedStorageKey(serverUrl: string, publicKey: string): string {
  return `${OPENAI_API_KEY_PREFIX}:${serverUrl}:${publicKey}`;
}

export function getLocalOpenAIApiKey(
  serverUrl?: string | null,
  publicKey?: string | null,
): string {
  if (!serverUrl || !publicKey) return '';

  try {
    return localStorage.getItem(getScopedStorageKey(serverUrl, publicKey)) ?? '';
  } catch {
    return '';
  }
}

export function setLocalOpenAIApiKey(
  serverUrl: string,
  publicKey: string,
  apiKey: string,
): void {
  try {
    const storageKey = getScopedStorageKey(serverUrl, publicKey);
    const trimmedKey = apiKey.trim();

    if (trimmedKey) {
      localStorage.setItem(storageKey, trimmedKey);
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // localStorage unavailable -- fail closed and keep going
  }
}

export function stripSensitiveProfileFields(profile?: IProfile | null): IProfile {
  if (!profile) {
    return {
      firstName: '',
      lastName: '',
      userPhoto: '',
      userBio: '',
      country: '',
    };
  }

  const { openaiApiKey: _openaiApiKey, ...safeProfile } = profile;
  return safeProfile;
}

export function mergeLocalOpenAIApiKey(
  profile: IProfile,
  serverUrl?: string | null,
  publicKey?: string | null,
): IProfile {
  const localKey = getLocalOpenAIApiKey(serverUrl, publicKey);

  if (!localKey) {
    return profile;
  }

  return {
    ...profile,
    openaiApiKey: localKey,
  };
}
