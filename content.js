// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
        console.log('Received extractData request');
        extractVideoData().then(sendResponse);
        return true; // Required for async response
    }
});

async function extractVideoData() {
    try {
        console.log('Starting video data extraction');
        const videoId = getVideoId();
        if (!videoId) {
            console.error('No video ID found in URL');
            throw new Error('No video ID found');
        }
        console.log('Found video ID:', videoId);

        const [title, description, tags] = await Promise.all([
            extractTitle(),
            extractDescription(),
            extractTags()
        ]);
        console.log('Extracted basic info:', { title, description, tagsCount: tags.length });

        // Try multiple methods to get the transcript
        console.log('Starting transcript extraction');
        const transcript = await extractTranscriptWithMultipleMethods(videoId);
        console.log('Transcript extraction result:', transcript ? 'Success' : 'No transcript found');

        return {
            success: true,
            data: {
                title,
                description,
                tags,
                transcript
            }
        };
    } catch (error) {
        console.error('Error in extractVideoData:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    console.log('URL params:', Object.fromEntries(urlParams.entries()));
    return videoId;
}

function extractTitle() {
    const titleElement = document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer');
    const title = titleElement ? titleElement.textContent.trim() : '';
    console.log('Title element found:', !!titleElement);
    return title;
}

function extractDescription() {
    const descriptionElement = document.querySelector('#description-inline-expander');
    const description = descriptionElement ? descriptionElement.textContent.trim() : '';
    console.log('Description element found:', !!descriptionElement);
    return description;
}

function extractTags() {
    const metaTags = document.querySelectorAll('meta[property="og:video:tag"]');
    const tags = Array.from(metaTags).map(tag => tag.content);
    console.log('Found tags:', tags.length);
    return tags;
}

async function extractTranscriptWithMultipleMethods(videoId) {
    console.log('Starting multiple method transcript extraction');
    // Try multiple methods in sequence
    const methods = [
        extractTranscriptFromDOM,
        extractTranscriptFromAPI,
        extractTranscriptFromPageSource,
        extractTranscriptFromNetwork
    ];

    for (const method of methods) {
        try {
            console.log(`Trying method: ${method.name}`);
            const transcript = await method(videoId);
            if (transcript && transcript !== 'No transcript available') {
                console.log(`Success with method: ${method.name}`);
                return transcript;
            }
            console.log(`Method ${method.name} returned no transcript`);
        } catch (error) {
            console.error(`Error in ${method.name}:`, error);
            continue;
        }
    }

    console.log('All methods failed to extract transcript');
    return 'No transcript available';
}

async function extractTranscriptFromDOM() {
    console.log('Starting DOM extraction');
    // Try to find and click the transcript button
    const transcriptButton = await findTranscriptButton();
    if (transcriptButton) {
        console.log('Found transcript button, clicking...');
        transcriptButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
        console.log('No transcript button found');
    }

    // Try multiple selectors for transcript content
    const selectors = [
        'ytd-transcript-segment-renderer',
        'ytd-transcript-body-renderer ytd-transcript-segment-renderer',
        '[role="listitem"]',
        '.ytd-transcript-segment-renderer',
        '.ytd-transcript-body-renderer',
        '#transcript-segments',
        '#transcript-content',
        'ytd-transcript-body-renderer yt-formatted-string',
        'ytd-transcript-segment-renderer yt-formatted-string'
    ];

    for (const selector of selectors) {
        console.log(`Trying selector: ${selector}`);
        const items = document.querySelectorAll(selector);
        if (items.length > 0) {
            console.log(`Found ${items.length} items with selector: ${selector}`);
            const transcript = Array.from(items).map(item => {
                const timestamp = item.querySelector('[id="timestamp"]')?.textContent.trim() || '';
                const text = item.querySelector('[id="content"]')?.textContent.trim() || item.textContent.trim();
                return `${timestamp} ${text}`;
            }).join('\n');
            return transcript;
        }
    }

    console.log('No transcript found in DOM');
    return null;
}

async function extractTranscriptFromAPI(videoId) {
    console.log('Starting API extraction');
    try {
        // Try to get the transcript data from the page source
        console.log('Fetching page source...');
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await response.text();
        console.log('Page source fetched, length:', html.length);
        
        // Look for transcript data in various formats
        const patterns = [
            /"captions":\s*({[^}]+})/,
            /"transcriptRenderer":\s*({[^}]+})/,
            /"transcriptData":\s*({[^}]+})/,
            /"captionsTracklistRenderer":\s*({[^}]+})/,
            /"transcript":\s*({[^}]+})/,
            /"transcriptText":\s*"([^"]+)"/,
            /"transcriptContent":\s*"([^"]+)"/,
            /"captions":\s*\[([^\]]+)\]/,
            /"transcript":\s*\[([^\]]+)\]/
        ];

        for (const pattern of patterns) {
            console.log(`Trying pattern: ${pattern}`);
            const match = html.match(pattern);
            if (match) {
                console.log('Pattern matched');
                try {
                    const data = JSON.parse(match[1]);
                    const transcript = processTranscriptData(data);
                    if (transcript) {
                        console.log('Successfully processed transcript data');
                        return transcript;
                    }
                } catch (e) {
                    console.log('JSON parse failed, trying raw match');
                    // If JSON parsing fails, try to use the raw match
                    if (match[1]) {
                        return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                    }
                }
            }
        }

        // Try the timedtext API
        console.log('Trying timedtext API...');
        const apiResponse = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`);
        if (apiResponse.ok) {
            const text = await apiResponse.text();
            if (text) {
                console.log('Successfully fetched from timedtext API');
                return text;
            }
        }

        console.log('No transcript found in API');
        return null;
    } catch (error) {
        console.error('Error in API extraction:', error);
        return null;
    }
}

async function extractTranscriptFromPageSource() {
    console.log('Starting page source extraction');
    try {
        // Look for transcript data in the page's JavaScript
        const scripts = document.querySelectorAll('script');
        console.log(`Found ${scripts.length} script tags`);
        
        for (const script of scripts) {
            const content = script.textContent;
            if (content.includes('captions') || content.includes('transcript')) {
                console.log('Found script with transcript/captions content');
                const patterns = [
                    /"captions":\s*({[^}]+})/,
                    /"transcriptRenderer":\s*({[^}]+})/,
                    /"transcriptData":\s*({[^}]+})/,
                    /"captionsTracklistRenderer":\s*({[^}]+})/,
                    /"transcript":\s*({[^}]+})/,
                    /"transcriptText":\s*"([^"]+)"/,
                    /"transcriptContent":\s*"([^"]+)"/
                ];

                for (const pattern of patterns) {
                    console.log(`Trying pattern: ${pattern}`);
                    const match = content.match(pattern);
                    if (match) {
                        console.log('Pattern matched');
                        try {
                            const data = JSON.parse(match[1]);
                            const transcript = processTranscriptData(data);
                            if (transcript) {
                                console.log('Successfully processed transcript data');
                                return transcript;
                            }
                        } catch (e) {
                            console.log('JSON parse failed, trying raw match');
                            // If JSON parsing fails, try to use the raw match
                            if (match[1]) {
                                return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                            }
                        }
                    }
                }
            }
        }

        console.log('No transcript found in page source');
        return null;
    } catch (error) {
        console.error('Error in page source extraction:', error);
        return null;
    }
}

async function extractTranscriptFromNetwork() {
    console.log('Starting network extraction');
    try {
        // Try to intercept network requests for transcript data
        const videoId = getVideoId();
        if (!videoId) {
            console.log('No video ID found for network extraction');
            return null;
        }

        // Try different API endpoints
        const endpoints = [
            `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
            `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
            `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv1`,
            `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv2`,
            `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`
        ];

        for (const endpoint of endpoints) {
            console.log(`Trying endpoint: ${endpoint}`);
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    const text = await response.text();
                    if (text) {
                        console.log('Successfully fetched from endpoint:', endpoint);
                        return text;
                    }
                }
            } catch (error) {
                console.error(`Error fetching from ${endpoint}:`, error);
                continue;
            }
        }

        console.log('No transcript found from network endpoints');
        return null;
    } catch (error) {
        console.error('Error in network extraction:', error);
        return null;
    }
}

async function findTranscriptButton() {
    console.log('Looking for transcript button');
    const selectors = [
        'button[aria-label*="transcript"]',
        'button[aria-label*="Transcript"]',
        'button[aria-label*="captions"]',
        'button[aria-label*="Captions"]',
        'ytd-menu-renderer button[aria-label*="transcript"]',
        'ytd-menu-renderer button[aria-label*="Transcript"]',
        'button[aria-label*="Show transcript"]',
        'button[aria-label*="show transcript"]',
        'button[aria-label*="Open transcript"]',
        'button[aria-label*="open transcript"]',
        'button[aria-label*="Show captions"]',
        'button[aria-label*="show captions"]'
    ];

    for (const selector of selectors) {
        console.log(`Trying selector: ${selector}`);
        const button = document.querySelector(selector);
        if (button) {
            console.log('Found transcript button with selector:', selector);
            return button;
        }
    }

    // Try to find and click the "..." menu
    console.log('Looking for more actions menu');
    const menuButton = document.querySelector('button[aria-label="More actions"]');
    if (menuButton) {
        console.log('Found more actions menu, clicking...');
        menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        // Look for transcript option in the menu
        const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
        console.log(`Found ${menuItems.length} menu items`);
        for (const item of menuItems) {
            if (item.textContent.toLowerCase().includes('transcript') || 
                item.textContent.toLowerCase().includes('captions')) {
                console.log('Found transcript/captions menu item, clicking...');
                item.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                return item;
            }
        }
    }

    console.log('No transcript button or menu found');
    return null;
}

function processTranscriptData(data) {
    console.log('Processing transcript data:', data);
    try {
        // Handle different data structures
        if (data.playerCaptionsTracklistRenderer?.captionTracks) {
            console.log('Processing caption tracks');
            const tracks = data.playerCaptionsTracklistRenderer.captionTracks;
            return tracks.map(track => {
                const name = track.name?.simpleText || 'Unknown';
                const lang = track.languageCode;
                const url = track.baseUrl;
                return `${name} (${lang}): ${url}`;
            }).join('\n');
        }
        
        if (data.captionTracks) {
            console.log('Processing caption tracks (alternative format)');
            return data.captionTracks.map(track => {
                const name = track.name?.simpleText || 'Unknown';
                const lang = track.languageCode;
                const url = track.baseUrl;
                return `${name} (${lang}): ${url}`;
            }).join('\n');
        }

        if (data.events) {
            console.log('Processing events data');
            return data.events.map(event => {
                const text = event.segs?.map(seg => seg.utf8).join('') || '';
                const time = event.tStartMs ? `[${formatTime(event.tStartMs)}]` : '';
                return `${time} ${text}`;
            }).join('\n');
        }

        // If we can't parse the data structure, return it as a string
        console.log('Returning raw data as string');
        return JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error processing transcript data:', error);
        return null;
    }
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
} 