/** @type {HTMLElement|null} */ let translateContainer;
/** @type {HTMLElement|null} */ let translateButton;
/** @type {HTMLElement|null} */ let translateTooltip;
/** @type {boolean} */ let isTranslating = false;

/**
 * Initializes the UI components of the translator
 * @returns {void}
 */
function initializeUI() {
  Promise.all([
    fetch(chrome.runtime.getURL("content.html"))
      .then(response => {
        if (!response.ok) throw new Error('Failed to load content.html');
        return response.text();
      })
      .catch(error => {
        console.error('Failed to load extension resources:', error);
        return '<div class="translate-error">Extension failed to load</div>';
      }),
    new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("content.css");
      link.onload = () => resolve();
      link.onerror = () => {
        console.error('Failed to load CSS');
        resolve();
      };
      document.head.appendChild(link);
    })
  ]).then(([html]) => {
    try {
      const container = document.createElement("div");
      container.innerHTML = html;
      container.id = "translate-container";
      document.body.appendChild(container);

      translateContainer = container;
      translateButton = document.getElementById("translate-btn");
      translateTooltip = document.getElementById("translate-tooltip");

      if (!translateButton || !translateTooltip) {
        throw new Error('Failed to initialize UI elements');
      }

      let img = document.getElementById("translate-icon");
      if (img) {
        img.src = chrome.runtime.getURL("./icons/icon48.png");
        img.onerror = () => {
          console.error('Failed to load icon');
          img.style.display = 'none';
        };
      }

      setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize UI:', error);
      if (container) {
        container.innerHTML = '<div class="translate-error">Failed to initialize translator</div>';
      }
    }
  });
}

/**
 * Handles text selection events and positions the translate button
 * @returns {void}
 */
function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText && translateContainer) {
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    translateContainer.style.left = `${rect.right + window.scrollX + 5}px`;
    translateContainer.style.top = `${rect.top + window.scrollY}px`;
    translateButton.style.display = "block";
  } else if (!isTranslating) {
    translateButton.style.display = "none";
    translateTooltip.style.display = "none";
  }
}

/**
 * Handles click events on the translate button
 * @param {MouseEvent} event - The click event
 * @returns {void}
 */
function handleButtonClick(event) {
  const isButtonClicked =
    translateButton && translateButton.contains(event.target);
  if (isButtonClicked) {
    const selectedText = window.getSelection().toString().trim();

    if (selectedText) {
      isTranslating = true;
      translateTooltip.innerText = "Translating...";
      translateTooltip.style.display = "block";
      translateTooltip.setAttribute("data-type", "loading");
      positionTooltip();

      chrome.runtime.sendMessage({
        action: "translate",
        text: selectedText,
      });

      translateButton.style.display = "none";
    }
  }
}

/**
 * Positions the tooltip relative to the viewport and button
 * @returns {void}
 */
function positionTooltip() {
  if (!translateTooltip || !translateContainer) return;

  const tooltipRect = translateTooltip.getBoundingClientRect();
  const containerRect = translateContainer.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  translateTooltip.style.left = '40px';
  translateTooltip.style.top = '0';
  translateTooltip.style.right = 'auto';
  translateTooltip.style.bottom = 'auto';

  if (containerRect.left + tooltipRect.width + 45 > viewportWidth) {
    translateTooltip.style.left = 'auto';
    translateTooltip.style.right = '40px';
  }

  if (containerRect.top + tooltipRect.height > viewportHeight) {
    translateTooltip.style.top = 'auto';
    translateTooltip.style.bottom = '0';
  }
}

/**
 * Handles messages from the background script
 * @param {Object} message - The message object
 * @param {string} message.action - The action to perform
 * @param {string} message.text - The text content
 * @param {string} [message.type="default"] - The type of message
 * @returns {void}
 */
function handleMessages(message) {
  if (message.action === "show_translation" && translateTooltip) {
    isTranslating = false;
    translateTooltip.innerText = message.text;
    translateTooltip.style.display = "block";
    translateTooltip.setAttribute("data-type", message.type || "default");
    
    setTimeout(positionTooltip, 0);

    if (message.type === "error") {
      setTimeout(() => {
        if (translateTooltip.getAttribute("data-type") === "error") {
          translateTooltip.style.display = "none";
        }
      }, 5000);
    }
  }
}

/**
 * Sets up all event listeners for the translator
 * @returns {void}
 */
function setupEventListeners() {
  document.addEventListener("mouseup", handleTextSelection);
  document.addEventListener("click", handleButtonClick);
  chrome.runtime.onMessage.addListener(handleMessages);

  window.addEventListener("resize", () => {
    if (translateTooltip.style.display === "block") {
      positionTooltip();
    }
  });

  window.addEventListener("unload", () => {
    document.removeEventListener("mouseup", handleTextSelection);
    document.removeEventListener("click", handleButtonClick);
    window.removeEventListener("resize", positionTooltip);
    chrome.runtime.onMessage.removeListener(handleMessages);
  });
}

/**
 * Handles keyboard events for the translator
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {void}
 */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && translateTooltip.style.display === "block") {
    translateTooltip.style.display = "none";
    translateButton.style.display = "none";
    isTranslating = false;
  }
});

document.addEventListener("DOMContentLoaded", initializeUI);
initializeUI();
