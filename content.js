// Inject HTML and CSS
fetch(chrome.runtime.getURL("content.html"))
  .then(response => response.text())
  .then(html => {
    let div = document.createElement("div");
    div.innerHTML = html;
    div.id = "translate-container";
    document.body.appendChild(div);

    let img = document.getElementById("translate-icon");
    img.src = chrome.runtime.getURL("./icons/icon48.png");
  });

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("content.css");
document.head.appendChild(link);

document.addEventListener("mouseup", function () {
  const selectedText = window.getSelection().toString().trim();
  const container = document.getElementById("translate-container");
  const btn = document.getElementById("translate-btn");
  const tooltip = document.getElementById("translate-tooltip");

  if (selectedText) {
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    container.style.left = `${rect.right + window.scrollX + 5}px`;
    container.style.top = `${rect.top + window.scrollY}px`;
    btn.style.display = "block";
  } else {
    btn.style.display = "none";
    tooltip.style.display = "none";
  }
});

document.addEventListener("click", function (event) {
  event.preventDefault();
  const btn = document.getElementById("translate-btn");
  const isButtonClicked = btn.contains(event.target);
  if (isButtonClicked) {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText) {
      chrome.runtime.sendMessage({ action: "translate", text: selectedText });
      btn.style.display = "none";
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "show_translation") {
    const tooltip = document.getElementById("translate-tooltip");
    const btn = document.getElementById("translate-btn");
    tooltip.innerText = message.text;
    tooltip.style.left = btn.style.left;
    tooltip.style.top = `${parseInt(btn.style.top) + 30}px`;
    tooltip.style.display = "block";

    setTimeout(() => {
      tooltip.style.display = "none";
    }, 3000);
  }
});
