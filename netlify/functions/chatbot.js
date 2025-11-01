// netlify/functions/chatbot.js

/**
 * Netlify Function Handler for the OpenRouter API call.
 * This function is accessible at the path: /.netlify/functions/chatbot
 */
exports.handler = async (event, context) => {
    // 1. SECURITY & METHOD CHECK
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' })
        };
    }

    // Securely retrieve the API key from environment variables.
    // **IMPORTANT**: You must set this variable in your Netlify UI settings (Build & Deploy -> Environment)
    const OPENROUTER_API_KEY = process.env.AIunclesamAPIkey;

    if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY environment variable is not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API key missing.' })
        };
    }

    // 2. PARSE THE USER PROMPT
    let data;
    try {
        // The body comes as a string, so we need to parse the JSON
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON payload.' })
        };
    }

    const userPrompt = data.prompt;

    if (!userPrompt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing prompt in request body.' })
        };
    }

    // 3. CONSTRUCT AND SEND API REQUEST TO OPENROUTER
    try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct-v0.2', // Example model, you can change this
                messages: [
                    // System message to give the bot personality/context
                    { role: 'system', content: 'You are a friendly, concise, and helpful Netlify chat bot powered by OpenRouter. Respond briefly.' },
                    // User's current message
                    { role: 'user', content: userPrompt }
                ],
                // OpenRouter specific header to identify your app
                'X-Title': 'Netlify Chat Demo App' 
            })
        });

        const jsonResponse = await openRouterResponse.json();

        if (!openRouterResponse.ok) {
             // Handle API error responses (e.g., 400, 429, 500)
             const errorDetails = jsonResponse.error ? jsonResponse.error.message : 'Unknown API error';
             console.error('OpenRouter API Error:', errorDetails);
             return {
                statusCode: openRouterResponse.status,
                body: JSON.stringify({ message: `External API Error: ${errorDetails}` })
            };
        }

        // Extract the AI's response message
        const aiMessage = jsonResponse.choices[0].message.content;

        // 4. RETURN SUCCESSFUL RESPONSE TO FRONTEND
        return {
            statusCode: 200,
            headers: { 
                // Important for CORS when testing locally with Netlify Dev
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ 
                message: aiMessage 
            })
        };

    } catch (error) {
        console.error('Function execution error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Internal server error: ${error.message}` })
        };
    }
};