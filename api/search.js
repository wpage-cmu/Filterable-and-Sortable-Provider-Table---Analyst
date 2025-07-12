const Anthropic = require('@anthropic-ai/sdk');

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

module.exports = async function handler(req, res) {
  console.log('🚀 SEARCH API: Handler called');
  console.log('=' .repeat(40));
  console.log('📊 Request method:', req.method);
  console.log('🔑 API key exists:', !!process.env.CLAUDE_API_KEY);
  console.log('🔑 API key length:', process.env.CLAUDE_API_KEY?.length || 0);
  
  if (req.method !== 'POST') {
    console.log('❌ SEARCH API: Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, sampleData, availableSpecialties, availableStates, totalRecords } = req.body;
    
    console.log('📝 SEARCH API: Request data received');
    console.log('📋 Query:', query);
    console.log('📊 Sample data count:', sampleData?.length);
    console.log('📊 Available specialties:', availableSpecialties?.length);
    console.log('📊 Available states:', availableStates?.length);
    console.log('📊 Total records:', totalRecords);

    const currentDate = new Date().toISOString().split('T')[0];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoDate = oneYearAgo.toISOString().split('T')[0];

    console.log('📅 Date context prepared:', { currentDate, oneYearAgoDate });

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

    console.log('🤖 SEARCH API: Calling Anthropic...');
    console.log('📝 Prompt length:', prompt.length);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log('✅ SEARCH API: Anthropic responded');
    console.log('📊 Response type:', response.content[0].type);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    console.log('📝 Raw Anthropic response:', content.text);

    const result = JSON.parse(content.text);
    
    console.log('✅ SEARCH API: JSON parsed successfully');
    console.log('🔍 Parsed filters:', result.filters);
    
    // Process date filters
    if (result.filters.lastAttestationDate) {
      console.log('📅 Processing date filter:', result.filters.lastAttestationDate);
      const dateFilter = result.filters.lastAttestationDate;
      if (dateFilter.startsWith('before_')) {
        const beforeDate = dateFilter.replace('before_', '');
        result.filters.lastAttestationDate = `<${beforeDate}`;
        console.log('📅 Converted to:', result.filters.lastAttestationDate);
      } else if (dateFilter.startsWith('after_')) {
        const afterDate = dateFilter.replace('after_', '');
        result.filters.lastAttestationDate = `>${afterDate}`;
        console.log('📅 Converted to:', result.filters.lastAttestationDate);
      }
    }
    
    // Validate the response structure
    if (!result.summary) {
      throw new Error('Invalid response: missing summary');
    }

    console.log('✅ SEARCH API: Validation complete');
    console.log('📦 Final result:', result);
    console.log('=' .repeat(40));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ SEARCH API: Error occurred');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500) // Truncate stack trace
    });
    console.log('=' .repeat(40));
    
    // Fallback response
    const fallbackResult = {
      filters: {},
      summary: `Sorry, I couldn't process that query. Please try rephrasing your question.`,
      showAll: true,
      relevantColumns: ['firstName', 'lastName', 'npi']
    };
    
    console.log('🔄 Sending fallback result:', fallbackResult);
    res.status(200).json(fallbackResult);
  }
}