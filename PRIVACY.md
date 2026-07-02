# Privacy Policy

Effective date: July 2, 2026

ChatGPT Folders is a browser extension that helps users organize ChatGPT conversations into folders inside the ChatGPT web sidebar.

## Data Stored by the Extension

The extension stores only the metadata needed to display folders and conversation shortcuts:

- Folder names
- ChatGPT conversation IDs
- Conversation titles
- Conversation URLs
- Created, updated, and last-seen timestamps

This data is stored in `chrome.storage.sync`, so it may sync through the user's browser account if browser sync is enabled.

## Data Not Collected

The extension does not collect, read, store, transmit, or sell:

- ChatGPT message contents
- User prompts or model responses
- Account passwords or authentication tokens
- Payment information
- Personal contact information
- Browsing history outside supported ChatGPT pages

## Network Use

The extension does not operate a backend service and does not upload extension data to any third-party server.

It runs only on:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

These host permissions are used to inject the folder interface into the ChatGPT sidebar.

## Permissions

The extension requests:

- `storage`: used to save folders and conversation metadata in the browser.
- ChatGPT host access: used only to show and update the folder UI on ChatGPT pages.

## Data Control

Users can remove stored extension data by deleting folders in the extension UI, clearing browser extension data, or uninstalling the extension.

## Contact

For questions or issues, open an issue in the project repository:

https://github.com/FengXuT/GPT-Folder/issues
