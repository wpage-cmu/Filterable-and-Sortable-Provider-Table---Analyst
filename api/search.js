const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Add at the top of both files
export const config = {
    runtime: 'nodejs18.x',
    maxDuration: 30, // Increase timeout for LLM calls
  };
  
  // Rest of your existing code...

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, sampleData, availableSpecialties, availableStates, totalRecords } = req.body;

    const currentDate = new Date().toISOString().split('T')[0];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoDate = oneYearAgo.toISOString().split('T')[0];

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

TOTAL RECORDS: ${totalRecords}

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

    const result = JSON.parse(content.text);
    
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

    res.status(200).json(result);
  } catch (error) {
    console.error('Search API Error:', error);
    
    // Fallback response
    res.status(200).json({
      filters: {},
      summary: `Sorry, I couldn't process that query. Please try rephrasing your question.`,
      showAll: true,
      relevantColumns: ['firstName', 'lastName', 'npi']
    });
  }
}