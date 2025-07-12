const Anthropic = require('@anthropic-ai/sdk');

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

module.exports = async function handler(req, res) {
  console.log('🚀 SUMMARY API: Handler called');
  console.log('=' .repeat(40));
  console.log('📊 Request method:', req.method);
  console.log('🔑 API key exists:', !!process.env.CLAUDE_API_KEY);
  
  if (req.method !== 'POST') {
    console.log('❌ SUMMARY API: Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { originalQuery, filteredData, totalCount } = req.body;

    console.log('📝 SUMMARY API: Request data received');
    console.log('📋 Original query:', originalQuery);
    console.log('📊 Filtered data count:', filteredData?.length);
    console.log('📊 Total count:', totalCount);

    // Handle empty results with consistent message
    if (filteredData.length === 0) {
      console.log('❌ SUMMARY API: No filtered data, returning empty message');
      return res.status(200).json({
        summary: "No providers found matching your search criteria."
      });
    }

    console.log('📊 Sample filtered data:', filteredData.slice(0, 2));

    const prompt = `You are providing a natural language summary of search results for a healthcare provider database. Provide a specific answer to the specific query asked of you, and only refer to the data passed to you. When you find an interesting pattern in the data related to the query, point that out too. Be concise and don't repeat points.

ORIGINAL USER QUERY: "${originalQuery}"

FILTERED RESULTS (${filteredData.length} out of ${totalCount} total providers):
${JSON.stringify(filteredData, null, 2)}
${filteredData.length > 5 ? `... and ${filteredData.length - 5} more providers` : ''}

Instructions:
1. Provide a natural, conversational summary of the results
2. Include the count (${filteredData.length} providers)
3. Mention key characteristics of the results if relevant (specialties, locations, statuses, etc.) If a user asks for specific counts, give them.
4. Be helpful and informative
5. Use proper grammar (1 provider vs 2 providers)
6. If the query asked "how many", lead with the count
7. Keep it concise but informative
8. Focus on the most interesting or relevant details from the actual data

Examples:
- "Found 3 urologists practicing in California, all with active attestation status"
- "Found 12 providers who last attested over a year ago - they may need to renew their attestations"
- "The top 3 specialties are Cardiology (9), Urology (7) and Orthopedics (4)"

Return only the summary text, no JSON or other formatting.`;

    console.log('🤖 SUMMARY API: Calling Anthropic...');
    console.log('📝 Prompt length:', prompt.length);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log('✅ SUMMARY API: Anthropic responded');
    console.log('📊 Response type:', response.content[0].type);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    console.log('📝 Raw Anthropic response:', content.text);

    const finalSummary = content.text.trim();
    console.log('✅ SUMMARY API: Final summary prepared');
    console.log('📝 Final summary:', finalSummary);
    console.log('=' .repeat(40));

    res.status(200).json({
      summary: finalSummary
    });
  } catch (error) {
    console.error('❌ SUMMARY API: Error occurred');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500) // Truncate stack trace
    });
    console.log('=' .repeat(40));
    
    // Fallback to simple count
    const { filteredData } = req.body;
    const plural = filteredData?.length === 1 ? 'provider' : 'providers';
    const fallbackSummary = `Found ${filteredData?.length || 0} ${plural} matching your search`;
    
    console.log('🔄 Sending fallback summary:', fallbackSummary);
    res.status(200).json({
      summary: fallbackSummary
    });
  }
}