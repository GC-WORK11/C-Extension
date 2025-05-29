# YouTube Data Extractor

A Chrome extension that allows you to easily extract and save information from YouTube videos, including titles, descriptions, tags, and transcripts.

## Features

- Extract video title, description, and tags
- Get full video transcripts (including auto-generated captions)
- Modern, user-friendly interface
- Copy individual sections or download all data at once
- Support for multiple languages (when available)

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to any YouTube video
2. Click the extension icon in your browser toolbar
3. Click "Extract Data" to gather information from the current video
4. Use the tabs to view different sections of the data
5. Copy individual sections or download all data as JSON

## Development

### Project Structure

- `manifest.json` - Extension configuration
- `popup.html` - Main UI
- `popup.js` - UI logic
- `content.js` - YouTube page interaction
- `background.js` - Background tasks
- `styles.css` - UI styling

### Building from Source

1. Make sure you have Node.js installed
2. Clone the repository
3. Install dependencies (if any)
4. Load the extension in Chrome as described in the Installation section

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- YouTube Data API
- Chrome Extension APIs
- Contributors and users of the extension 