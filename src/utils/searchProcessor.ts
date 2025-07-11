type SearchPattern = {
  patterns: string[];
  filter: (data: any, query: string) => boolean;
  sort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  description: string;
  response?: string;
  relevantColumns?: string[];
};
const searchPatterns: SearchPattern[] = [{
  patterns: ['active (.*) in (.*)', 'show me active (.*) in (.*)', 'find active (.*) in (.*)', 'show active (.*) in (.*)', 'active (.*) in (.*)',
  // Added exact pattern match
  'active (.*) (.*)'],
  filter: (provider, query: string) => {
    const isActive = provider.attestationStatus === 'Active';
    // Extract specialty and location from query
    const specialtyMatch = query.match(/active (.*?) in/i)?.[1] || query.match(/active (.*?) (california|ca)/i)?.[1];
    const locationMatch = query.match(/in (.*?)$/i)?.[1] || query.match(/active .*? (california|ca)/i)?.[1];
    // Match specialty exactly (case-insensitive)
    const matchesSpecialty = specialty => provider.specialty.toLowerCase() === specialty.toLowerCase();
    // Match location including state code variations
    const matchesLocation = location => {
      if (!location) return false;
      const stateCode = location.length === 2 ? location.toUpperCase() : getStateCode(location);
      return provider.primaryPracticeState === stateCode || provider.otherPracticeStates.includes(stateCode);
    };
    // All conditions must be true for a match
    return isActive && specialtyMatch && matchesSpecialty(specialtyMatch) && locationMatch && matchesLocation(locationMatch);
  },
  description: 'Active providers by specialty and location',
  response: "I've filtered to show active providers matching your specialty and location criteria. You might also want to try:\n- 'Show all providers in this location'\n- 'Show inactive providers with this specialty'\n- 'Show recent attestations for this specialty'",
  relevantColumns: ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates']
}, {
  patterns: ['active (.*) california', 'active (.*) in california', 'active california', 'california active'],
  filter: provider => {
    const isActive = provider.attestationStatus === 'Active';
    const isInCalifornia = provider.primaryPracticeState === 'CA' || provider.otherPracticeStates.includes('CA');
    return isActive && isInCalifornia;
  },
  description: 'Active providers in California',
  response: "I've found active providers in California. You might also want to ask:\n- 'Show me active providers in other states'\n- 'Which specialties are active in California?'\n- 'Show recent attestations in California'",
  relevantColumns: ['attestationStatus', 'primaryPracticeState', 'otherPracticeStates']
}, {
  patterns: ['active attestation', 'who have an active', 'only show active', 'show me active', 'currently active', 'active providers', 'active status'],
  filter: provider => provider.attestationStatus === 'Active',
  description: 'Providers with active attestation status',
  response: "I've found all providers with active attestation status. You might also want to ask:\n- 'Show me active providers in California'\n- 'Which active providers recently attested?'\n- 'Show active cardiologists'",
  relevantColumns: ['attestationStatus']
}, {
  patterns: ['recent attestation', 'recently attested', 'attested recently', 'new attestations', 'latest attestations', 'who recently attested'],
  filter: provider => {
    const attestationDate = new Date(provider.lastAttestationDate);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return attestationDate >= twoWeeksAgo;
  },
  sort: {
    key: 'lastAttestationDate',
    direction: 'desc'
  },
  description: 'Providers who attested in the last 14 days',
  response: "Here are the recent attestations. Try asking:\n- 'Show only active recent attestations'\n- 'Which specialties recently attested?'\n- 'Show recent attestations by state'",
  relevantColumns: ['lastAttestationDate', 'attestationStatus']
}, {
  patterns: ['expired', 'who have expired', 'show expired', 'expired status', 'expired providers', 'expired attestation'],
  filter: provider => provider.attestationStatus === 'Expired',
  description: 'Providers with expired status',
  response: "I found providers with expired status. You might want to know:\n- 'When did these providers last attest?'\n- 'Show expired providers by state'\n- 'Which specialties have expired attestations?'",
  relevantColumns: ['attestationStatus']
}, {
  patterns: ['pending', 'who are pending', 'show pending', 'pending status', 'pending providers', 'pending attestation'],
  filter: provider => provider.attestationStatus === 'Pending',
  description: 'Providers with pending attestation',
  response: "Here are the pending attestations. Try asking:\n- 'Show pending attestations by date'\n- 'Which states have pending providers?'\n- 'Show pending providers by specialty'",
  relevantColumns: ['attestationStatus']
}, {
  patterns: ['accepting patients', 'accepting new patients', 'taking patients', 'patient status', 'accepting status'],
  filter: provider => provider.acceptingPatientStatus === 'Yes',
  description: 'Providers accepting new patients',
  response: "Here are providers currently accepting new patients. You can also ask:\n- 'Show providers with limited patient acceptance'\n- 'Which specialties are accepting patients?'\n- 'Show accepting providers by location'",
  relevantColumns: ['acceptingPatientStatus', 'specialty', 'primaryPracticeState']
}, {
  patterns: ['not accepting', 'not taking patients', 'closed to patients'],
  filter: provider => provider.acceptingPatientStatus === 'No',
  description: 'Providers not accepting new patients',
  response: "These providers are currently not accepting new patients. Try asking:\n- 'Show providers accepting patients'\n- 'Which providers have limited acceptance?'",
  relevantColumns: ['acceptingPatientStatus']
}, {
  patterns: ['due date', 'attestation due', 'when due', 'expiring soon'],
  filter: provider => {
    const dueDate = new Date(provider.attestationDueDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return dueDate <= thirtyDaysFromNow;
  },
  sort: {
    key: 'attestationDueDate',
    direction: 'asc'
  },
  description: 'Providers with attestations due soon (within 30 days)',
  response: "Here are providers with attestations due within 30 days. You might want to:\n- 'Show all due dates'\n- 'Find overdue attestations'\n- 'Show due dates by specialty'",
  relevantColumns: ['attestationDueDate', 'attestationStatus', 'specialty']
}, {
  patterns: ['specialty', 'specialties', 'specialized'],
  filter: () => true,
  sort: {
    key: 'specialty',
    direction: 'asc'
  },
  description: 'Providers by specialty',
  response: "I can help you find providers by specialty. Try asking about specific specialties like 'Show me cardiologists'.",
  relevantColumns: ['specialty']
}, {
  patterns: ['state', 'location', 'practice in', 'address'],
  filter: () => true,
  description: 'Providers by location',
  response: 'I can help you find providers by state or address. You can ask about specific states or see all practice locations.',
  relevantColumns: ['primaryPracticeState', 'otherPracticeStates', 'primaryWorkAddress']
}];
// Helper function to convert state names to codes (simplified version)
const stateMap = {
  california: 'CA',
  texas: 'TX',
  florida: 'FL',
  arizona: 'AZ',
  nevada: 'NV',
  oregon: 'OR',
  washington: 'WA',
  newyork: 'NY',
  newjersey: 'NJ'
  // Add more common states
};
// Update getStateCode function
const getStateCode = (stateName: string): string => {
  const normalizedName = stateName.toLowerCase().replace(/\s+/g, '');
  return stateMap[normalizedName] || stateName.toUpperCase();
};
export type SearchResult = {
  filteredData: any[];
  sort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  description: string;
  response?: string;
  relevantColumns?: string[];
};
export const processNaturalLanguageSearch = (query: string, data: any[]): SearchResult | null => {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 3) return null;
  // Check for compound search criteria
  const hasStatus = /(active|inactive|pending|expired)/i.test(normalizedQuery);
  const hasSpecialty = data.map(item => item.specialty.toLowerCase()).some(specialty => normalizedQuery.includes(specialty.toLowerCase()));
  const hasLocation = /(in|at|from) (.*?)($|\s)/i.test(normalizedQuery) || Object.keys(stateMap).some(state => normalizedQuery.includes(state.toLowerCase()));
  // If we have multiple criteria, prioritize the complex pattern matching
  if (hasStatus && hasSpecialty || hasStatus && hasLocation || hasSpecialty && hasLocation) {
    for (const pattern of searchPatterns) {
      if (pattern.patterns.some(p => {
        const regex = new RegExp(p, 'i');
        return regex.test(normalizedQuery);
      })) {
        return {
          filteredData: data.filter(item => pattern.filter(item, normalizedQuery)),
          sort: pattern.sort,
          description: pattern.description,
          response: pattern.response,
          relevantColumns: pattern.relevantColumns
        };
      }
    }
  }
  // For simple searches, show columns that match the search term
  if (normalizedQuery.length <= 20 && !normalizedQuery.includes('?')) {
    const relevantColumns = Object.keys(data[0] || {}).filter(key => data.some(item => {
      const value = item[key];
      return value && value.toString().toLowerCase().includes(normalizedQuery);
    }));
    return {
      filteredData: data.filter(item => Object.values(item).some(value => value && (Array.isArray(value) ? value.some(v => v.toString().toLowerCase().includes(normalizedQuery)) : value.toString().toLowerCase().includes(normalizedQuery)))),
      description: `Results for "${query}"`,
      response: 'I found these results. Would you like to filter them further?',
      relevantColumns
    };
  }
  for (const pattern of searchPatterns) {
    if (pattern.patterns.some(p => {
      const regex = new RegExp(p, 'i');
      return regex.test(normalizedQuery);
    })) {
      return {
        filteredData: data.filter(item => pattern.filter(item, normalizedQuery)),
        sort: pattern.sort,
        description: pattern.description,
        response: pattern.response,
        relevantColumns: pattern.relevantColumns
      };
    }
  }
  if (normalizedQuery.includes('?') || normalizedQuery.startsWith('how') || normalizedQuery.startsWith('what') || normalizedQuery.startsWith('where') || normalizedQuery.startsWith('show')) {
    return {
      filteredData: data,
      description: "I'm not sure I understood that exactly. Try asking about providers, attestations, specialties, or locations.",
      response: "You can try phrases like 'Show active providers' or 'Find recent attestations'."
    };
  }
  return null;
};