chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "translate") {
    const textToTranslate = message.text;
    fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|uk`)
      .then(response => response.json())
      .then(data => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "show_translation",
          text: data.responseData.translatedText,
        });
      });
  }
});
