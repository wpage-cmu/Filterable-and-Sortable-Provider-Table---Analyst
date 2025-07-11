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
  // Get sample data for context
  const sampleData = data.slice(0, 3);
  const availableSpecialties = [...new Set(data.map(item => item.specialty))].slice(0, 10);
  const availableStates = [...new Set(data.map(item => item.primaryPracticeState))];

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        sampleData,
        availableSpecialties,
        availableStates,
        totalRecords: data.length
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
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
  try {
    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalQuery,
        filteredData,
        totalCount
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Summary generation error:', error);
    
    // Fallback to simple count
    const plural = filteredData.length === 1 ? 'provider' : 'providers';
    return `Found ${filteredData.length} ${plural} matching your search`;
  }
};