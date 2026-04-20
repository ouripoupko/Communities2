// Fake personas used to populate demo community state with believable
// participation across countries.

export interface Persona {
  publicKey: string;
  firstName: string;
  lastName: string;
  country: string;
  userBio: string;
  userPhoto: string;
}

export const PERSONAS: Persona[] = [
  { publicKey: 'demo-user-kenya-amina',  firstName: 'Amina',  lastName: 'Odhiambo', country: 'KE', userBio: 'Water rights organiser in Nairobi', userPhoto: '' },
  { publicKey: 'demo-user-nigeria-chinedu', firstName: 'Chinedu', lastName: 'Okafor', country: 'NG', userBio: 'Community health worker, Lagos', userPhoto: '' },
  { publicKey: 'demo-user-india-priya', firstName: 'Priya', lastName: 'Menon', country: 'IN', userBio: 'Climate policy researcher, Chennai', userPhoto: '' },
  { publicKey: 'demo-user-bangladesh-rahim', firstName: 'Rahim', lastName: 'Ahmed', country: 'BD', userBio: 'Flood resilience engineer', userPhoto: '' },
  { publicKey: 'demo-user-usa-jordan', firstName: 'Jordan', lastName: 'Lee', country: 'US', userBio: 'Civic tech advocate in Oakland', userPhoto: '' },
  { publicKey: 'demo-user-brazil-mariana', firstName: 'Mariana', lastName: 'Silva', country: 'BR', userBio: 'Anti-misinformation journalist', userPhoto: '' },
  { publicKey: 'demo-user-philippines-dante', firstName: 'Dante', lastName: 'Reyes', country: 'PH', userBio: 'Typhoon response coordinator', userPhoto: '' },
  { publicKey: 'demo-user-germany-lena', firstName: 'Lena', lastName: 'Becker', country: 'DE', userBio: 'Digital rights lawyer, Berlin', userPhoto: '' },
  { publicKey: 'demo-user-france-emile', firstName: 'Émile', lastName: 'Dupont', country: 'FR', userBio: 'Data protection researcher', userPhoto: '' },
  { publicKey: 'demo-user-japan-haruki', firstName: 'Haruki', lastName: 'Tanaka', country: 'JP', userBio: 'Urban planner, Tokyo', userPhoto: '' },
  { publicKey: 'demo-user-spain-lucia', firstName: 'Lucía', lastName: 'Fernández', country: 'ES', userBio: 'Youth employment counsellor', userPhoto: '' },
  { publicKey: 'demo-user-greece-kostas', firstName: 'Kostas', lastName: 'Papadopoulos', country: 'GR', userBio: 'Cooperative economist', userPhoto: '' },
  { publicKey: 'demo-user-egypt-yara', firstName: 'Yara', lastName: 'Hassan', country: 'EG', userBio: 'EdTech entrepreneur, Cairo', userPhoto: '' },
  { publicKey: 'demo-user-southafrica-thandi', firstName: 'Thandi', lastName: 'Mokoena', country: 'ZA', userBio: 'Community organiser, Johannesburg', userPhoto: '' },
  { publicKey: 'demo-user-malawi-blessings', firstName: 'Blessings', lastName: 'Phiri', country: 'MW', userBio: 'Smallholder farmer cooperative lead', userPhoto: '' },
  { publicKey: 'demo-user-mexico-sofia', firstName: 'Sofía', lastName: 'Ramírez', country: 'MX', userBio: 'Disaster preparedness trainer', userPhoto: '' },
  { publicKey: 'demo-user-fiji-api', firstName: 'Api', lastName: 'Vuniwaqa', country: 'FJ', userBio: 'Pacific climate adaptation lead', userPhoto: '' },
  { publicKey: 'demo-user-chile-matías', firstName: 'Matías', lastName: 'González', country: 'CL', userBio: 'Renewables policy analyst', userPhoto: '' },
  { publicKey: 'demo-user-ghana-kwame', firstName: 'Kwame', lastName: 'Asante', country: 'GH', userBio: 'Youth mobilisation, Accra', userPhoto: '' },
  { publicKey: 'demo-user-canada-ethan', firstName: 'Ethan', lastName: 'Mackenzie', country: 'CA', userBio: 'Civic assembly facilitator', userPhoto: '' },
];

export function pick<T>(arr: T[], n: number, seed = 0): T[] {
  // Deterministic pseudo-random selection so demo state is reproducible.
  const result: T[] = [];
  let s = seed || 1;
  const pool = [...arr];
  const take = Math.min(n, pool.length);
  for (let i = 0; i < take; i += 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % pool.length;
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}
