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
  };
  summary: string;
  showAll?: boolean;
}

export const searchProvidersWithLLM = async (
  query: string, 
  data: any[]
): Promise<LLMSearchResult> => {
  const prompt = `You are helping users search through a healthcare provider database. 

DATABASE SCHEMA:
- firstName: string
- lastName: string  
- npi: string (National Provider Identifier)
- attestationStatus: "Active" | "Inactive" | "Pending" | "Expired"
- lastAttestationDate: string (YYYY-MM-DD format)
- specialty: string (e.g., "Cardiology", "Urologist", "Pediatrics")
- primaryPracticeState: string (2-letter state code like "CA", "TX")
- otherPracticeStates: string[] (array of 2-letter state codes)

CURRENT DATA:
${JSON.stringify(data, null, 2)}

USER QUERY: "${query}"

Please analyze the query and return a JSON response with:
1. "filters" - object with filter criteria to apply to the data
2. "summary" - a natural language summary of what was found
3. "showAll" - set to true if no filtering is needed

For date queries like "over one year ago", calculate from today's date: ${new Date().toISOString().split('T')[0]}

Examples:
- "show urologists in california" → filters by specialty="Urologist" and state="CA"
- "how many active providers" → filters by attestationStatus="Active" and includes count in summary
- "providers with expired status" → filters by attestationStatus="Expired"

Return ONLY valid JSON, no other text.`;

  try {
    // Add this right before the anthropic.messages.create call (around line 45)
    console.log('Prompt length:', prompt.length);
    console.log('Data size:', JSON.stringify(data).length);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
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
    
    // Validate the response structure
    if (!result.summary) {
      throw new Error('Invalid response: missing summary');
    }

    return result;
  } catch (error) {
    console.error('LLM Service Error:', error);
    
    // Fallback response
    return {
      filters: {},
      summary: `Sorry, I couldn't process that query. Please try rephrasing your question.`,
      showAll: true
    };
  }
};