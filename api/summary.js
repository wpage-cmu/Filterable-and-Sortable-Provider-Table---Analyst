const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { originalQuery, filteredData, totalCount } = req.body;

    // Handle empty results with consistent message
    if (filteredData.length === 0) {
      return res.status(200).json({
        summary: "No providers found matching your search criteria."
      });
    }

    const prompt = `You are providing a natural language summary of search results for a healthcare provider database.

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

    res.status(200).json({
      summary: content.text.trim()
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    
    // Fallback to simple count
    const { filteredData } = req.body;
    const plural = filteredData.length === 1 ? 'provider' : 'providers';
    res.status(200).json({
      summary: `Found ${filteredData.length} ${plural} matching your search`
    });
  }
}