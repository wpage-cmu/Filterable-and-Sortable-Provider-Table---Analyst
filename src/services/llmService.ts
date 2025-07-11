import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true // Required for frontend usage
});

export interface LLMSearchResult {
  filters: {
    attestationStatus?: string[];
    specialty?: string[];
    primaryPracticeState?: string[];
    otherPracticeStates?: string[];
    firstName?: string;
    lastName?: string;
    npi?: string;
    lastAttestationDate?: string; // For date range queries
  };
  summary: string;
  showAll?: boolean;
  relevantColumns?: string[];
}

export const searchProvidersWithLLM = async (
  query: string, 
  data: any[]
): Promise<LLMSearchResult> => {
  const currentDate = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoDate = oneYearAgo.toISOString().split('T')[0];

  // Get sample data for context
  const sampleData = data.slice(0, 3);
  const availableSpecialties = [...new Set(data.map(item => item.specialty))].slice(0, 10);
  const availableStates = [...new Set(data.map(item => item.primaryPracticeState))];

  const prompt = `You are helping users search through a healthcare provider database. 

DATABASE SCHEMA:
- firstName: string (provider's first name)
- lastName: string (provider's last name)  
- npi: string (National Provider Identifier)
- attestationStatus: "Active" | "Inactive" | "Pending" | "Expired"
- lastAttestationDate: string (YYYY-MM-DD format)
- specialty: string (medical specialty)
- primaryPracticeState: string (2-letter state code like "CA", "TX")
- otherPracticeStates: string[] (array of 2-letter state codes)

CURRENT DATE: ${currentDate}
ONE YEAR AGO: ${oneYearAgoDate}

AVAILABLE SPECIALTIES: ${availableSpecialties.join(', ')}
AVAILABLE STATES: ${availableStates.join(', ')}

SAMPLE DATA:
${JSON.stringify(sampleData, null, 2)}

TOTAL RECORDS: ${data.length}

USER QUERY: "${query}"

Instructions:
1. Analyze the query and determine what filters to apply
2. For date queries like "over one year ago", use dates before ${oneYearAgoDate}
3. For state queries, convert full state names to codes (California = CA, New York = NY, etc.)
4. For specialty queries, match against available specialties (be flexible with variations)
5. DO NOT include specific counts in your summary - the system will calculate the actual count
6. Provide a helpful description of what filters will be applied
7. Include relevant columns that should be shown for this query

Examples:
- "providers in California with urologist specialty" → filters: {specialty: ["Urologist"], primaryPracticeState: ["CA"]}, summary: "Searching for urologists practicing in California"
- "how many providers attested over one year ago" → filters: {lastAttestationDate: "before_${oneYearAgoDate}"}, summary: "Searching for providers who last attested over one year ago"
- "active cardiologists" → filters: {attestationStatus: ["Active"], specialty: ["Cardiology"]}, summary: "Searching for active cardiologists"

Return ONLY valid JSON with this structure:
{
  "filters": {
    // Filter criteria - use arrays for multiple values
    // For date ranges, use special format: "before_YYYY-MM-DD" or "after_YYYY-MM-DD"
  },
  "summary": "Brief description of what you're searching for (no counts)",
  "relevantColumns": ["array", "of", "column", "names", "to", "show"],
  "showAll": false
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const result = JSON.parse(content.text) as LLMSearchResult;
    
    // Process date filters
    if (result.filters.lastAttestationDate) {
      const dateFilter = result.filters.lastAttestationDate;
      if (dateFilter.startsWith('before_')) {
        const beforeDate = dateFilter.replace('before_', '');
        result.filters.lastAttestationDate = `<${beforeDate}`;
      } else if (dateFilter.startsWith('after_')) {
        const afterDate = dateFilter.replace('after_', '');
        result.filters.lastAttestationDate = `>${afterDate}`;
      }
    }
    
    // Validate the response structure
    if (!result.summary) {
      throw new Error('Invalid response: missing summary');
    }

    return result;
  } catch (error) {
    console.error('LLM Filter Generation Error:', error);
    
    // Fallback response
    return {
      filters: {},
      summary: `Sorry, I couldn't process that query. Please try rephrasing your question.`,
      showAll: true,
      relevantColumns: ['firstName', 'lastName', 'npi']
    };
  }
};

export const generateSummaryWithLLM = async (
  originalQuery: string,
  filteredData: any[],
  totalCount: number
): Promise<string> => {
  // Handle empty results with consistent message
  if (filteredData.length === 0) {
    return "No providers found matching your search criteria.";
  }

  const prompt = `You are providing a natural language summary of search results for a healthcare provider database. Be concise but descriptive."

ORIGINAL USER QUERY: "${originalQuery}"

FILTERED RESULTS (${filteredData.length} out of ${totalCount} total providers):
${JSON.stringify(filteredData.slice(0, 5), null, 2)}
${filteredData.length > 5 ? `... and ${filteredData.length - 5} more providers` : ''}

Instructions:
1. Provide a natural, conversational summary of the results
2. Include the count (${filteredData.length} providers)
3. Mention key characteristics of the results if relevant (specialties, locations, statuses, etc.)
4. Be helpful and informative
5. Use proper grammar (1 provider vs 2 providers)
6. If the query asked "how many", lead with the count
7. Keep it concise but informative
8. Focus on the most interesting or relevant details from the actual data

Examples:
- "Found 3 urologists practicing in California, all with active attestation status"
- "Found 12 providers who last attested over a year ago - they may need to renew their attestations"
- "Found 1 cardiologist in New York with active status"

Return only the summary text, no JSON or other formatting.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text.trim();
  } catch (error) {
    console.error('Summary generation error:', error);
    
    // Fallback to simple count
    const plural = filteredData.length === 1 ? 'provider' : 'providers';
    return `Found ${filteredData.length} ${plural} matching your search`;
  }
};