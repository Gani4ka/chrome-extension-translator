import { CONFIG } from "./config.js";

/** @type {string} */ const TARGET_LANGUAGE = "uk";
/** @type {string} */ const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

if (!CONFIG.API_KEY) {
  console.error("DeepL API key is missing. Please check your config.js file.");
}

/**
 * Translates text using the DeepL API
 * @param {string} text - The text to translate
 * @returns {Promise<string>} The translated text or error message
 * @throws {Error} When the API request fails
 */
async function translateText(text) {
  try {
    const response = await fetch(DEEPL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${CONFIG.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: [text],
        target_lang: TARGET_LANGUAGE
      })
    });
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Network error: Invalid response format");
    }

    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("Authentication failed. Please check your API key.");
      } else if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else {
        throw new Error(`DeepL API error: ${data.message || response.statusText}`);
      }
    }
    
    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    } else {
      throw new Error("No translation returned");
    }
  } catch (error) {
    console.error("Translation failed:", error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return `Error: Network connection failed. Please check your internet connection.`;
    } else if (error.message.includes('CORS')) {
      return `Error: CORS policy violation. Please check extension permissions.`;
    }
    
    return `Error: ${error.message}`;
  }
}

/**
 * Listens for translation requests from content scripts
 * @param {Object} message - The message object
 * @param {string} message.action - The action to perform
 * @param {string} message.text - The text to translate
 * @param {chrome.runtime.MessageSender} sender - The message sender
 * @returns {boolean} Whether to keep the message channel open
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "translate") {
    translateText(message.text)
      .then(translatedText => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "show_translation",
          text: translatedText,
          type: translatedText.startsWith("Error:") ? "error" : "default"
        });
      })
      .catch(error => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "show_translation",
          text: `Error: ${error.message}`,
          type: "error"
        });
      });
  }
  const keepChannelOpen = true;
  return keepChannelOpen;
});
