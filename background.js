// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Data Extractor installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTranscript') {
        handleTranscriptRequest(request.videoId)
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Required for async response
    }
    if (request.action === 'processWithGemini') {
        processWithGemini(request.text)
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Required for async response
    }
});

async function handleTranscriptRequest(videoId) {
    try {
        // This is a placeholder for actual transcript fetching logic
        // In a real implementation, you would need to:
        // 1. Use YouTube's Data API or
        // 2. Parse the transcript from the video page
        return {
            success: true,
            transcript: 'Transcript data would be fetched here'
        };
    } catch (error) {
        console.error('Error fetching transcript:', error);
        throw error;
    }
}

async function processWithGemini(text) {
    try {
        const API_KEY = await getApiKey();
        if (!API_KEY) {
            throw new Error('Gemini API key not found. Please set it in the extension options.');
        }

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Please analyze and summarize this transcript, highlighting key points and main topics:\n\n${text}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to process with Gemini API');
        }

        const data = await response.json();
        return {
            success: true,
            result: data.candidates[0].content.parts[0].text
        };
    } catch (error) {
        console.error('Error processing with Gemini:', error);
        throw error;
    }
}

async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            resolve(result.geminiApiKey);
        });
    });
} 