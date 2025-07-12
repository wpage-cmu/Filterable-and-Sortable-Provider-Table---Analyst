// src/services/llmService.ts
export interface LLMSearchResult {
  filters: {
    attestationStatus?: string[];
    specialty?: string[];
    primaryPracticeState?: string[];
    otherPracticeStates?: string[];
    firstName?: string;
    lastName?: string;
    npi?: string;
    lastAttestationDate?: string;
  };
  summary: string;
  showAll?: boolean;
  relevantColumns?: string[];
}

export const searchProvidersWithLLM = async (
  query: string, 
  data: any[]
): Promise<LLMSearchResult> => {
  console.log('🎯 STEP 1: Starting LLM search flow');
  console.log('📝 User query:', query);
  console.log('📊 Total data records:', data.length);
  
  // Prepare context data
  const sampleData = data;
  const availableSpecialties = [...new Set(data.map(item => item.specialty))].slice(0, 10);
  const availableStates = [...new Set(data.map(item => item.primaryPracticeState))];

  console.log('📋 Context prepared:', {
    sampleDataCount: sampleData.length,
    availableSpecialties: availableSpecialties.length,
    availableStates: availableStates.length
  });

  try {
    console.log('🚀 STEP 2: Sending query to LLM filter endpoint...');
    console.log('📡 Request URL: /api/search');
    
    const requestPayload = {
      query,
      sampleData,
      availableSpecialties,
      availableStates,
      totalRecords: data.length
    };
    
    console.log('📦 Request payload:', {
      query,
      sampleDataLength: sampleData.length,
      specialtiesCount: availableSpecialties.length,
      statesCount: availableStates.length,
      totalRecords: data.length
    });

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('📡 STEP 3: Filter API response received');
    console.log('📊 Response status:', response.status);
    console.log('✅ Response ok:', response.ok);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ STEP 3 FAILED: API response error');
      console.error('Error text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ STEP 3 SUCCESS: LLM filter result received');
    console.log('🔍 Filters generated:', result.filters);
    console.log('📝 Initial summary:', result.summary);
    console.log('📋 Relevant columns:', result.relevantColumns);
    console.log('🔄 Show all flag:', result.showAll);
    
    return result;
  } catch (error) {
    console.error('❌ STEP 2-3 FAILED: LLM Filter Generation Error');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Fallback response
    const fallbackResult = {
      filters: {},
      summary: `Sorry, I couldn't process that query. Please try rephrasing your question.`,
      showAll: true,
      relevantColumns: ['firstName', 'lastName', 'npi']
    };
    
    console.log('🔄 Returning fallback result:', fallbackResult);
    return fallbackResult;
  }
};

export const generateSummaryWithLLM = async (
  originalQuery: string,
  filteredData: any[],
  totalCount: number
): Promise<string> => {
  console.log('🎯 STEP 5: Starting summary generation');
  console.log('📝 Original query:', originalQuery);
  console.log('📊 Filtered data count:', filteredData.length);
  console.log('📊 Total count:', totalCount);
  
  try {
    console.log('🚀 STEP 6: Sending to summary endpoint...');
    
    const requestPayload = {
      originalQuery,
      filteredData,
      totalCount
    };
    
    console.log('📦 Summary payload:', {
      originalQuery,
      filteredDataLength: filteredData.length,
      totalCount,
      sampleData: filteredData.slice(0, 2) // Show first 2 for logging
    });

    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('📡 STEP 6: Summary API response received');
    console.log('📊 Response status:', response.status);
    console.log('✅ Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ STEP 6 FAILED: Summary API error');
      console.error('Error text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ STEP 6 SUCCESS: Summary generated');
    console.log('📝 Final summary:', result.summary);
    
    return result.summary;
  } catch (error) {
    console.error('❌ STEP 5-6 FAILED: Summary generation error');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Fallback to simple count
    const plural = filteredData.length === 1 ? 'provider' : 'providers';
    const fallbackSummary = `Found ${filteredData.length} ${plural} matching your search`;
    
    console.log('🔄 Returning fallback summary:', fallbackSummary);
    return fallbackSummary;
  }
};