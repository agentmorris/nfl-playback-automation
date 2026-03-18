// NFL Playback Position Saver - Content Script
// Runs on nfl.com/plus/games/* pages

(function () {
  "use strict";

  const SAVE_INTERVAL_MS = 5000;
  const MIN_POSITION_TO_SAVE = 5; // Don't save if less than 5 seconds in

  let gameSlug = null;
  let storageKey = null;
  let video = null;
  let saveInterval = null;
  let videoChecker = null;
  let hasRestored = false;

  // Extract game slug from URL, e.g. "broncos-at-ravens-2009-reg-8"
  function getGameSlug() {
    const match = window.location.pathname.match(/\/plus\/games\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }
    return m + ":" + String(s).padStart(2, "0");
  }

  function savePosition() {
    if (!video || !storageKey) return;
    if (video.paused && hasRestored) return;
    const time = video.currentTime;
    if (time < MIN_POSITION_TO_SAVE) return;

    chrome.storage.local.set({
      [storageKey]: {
        time: time,
        duration: video.duration,
        slug: gameSlug,
        url: window.location.href,
        savedAt: new Date().toISOString(),
      },
    });
  }

  function restorePosition() {
    if (hasRestored) return;
    hasRestored = true;

    chrome.storage.local.get(storageKey, function (result) {
      const data = result[storageKey];
      if (!data || !data.time) return;

      // Don't restore if the saved position is near the very end
      if (video.duration && data.time > video.duration - 10) return;

      console.log(
        "[NFL Position Saver] Restoring to " +
          formatTime(data.time) +
          " (saved " +
          data.savedAt +
          ")"
      );
      video.currentTime = data.time;
    });
  }

  function onVideoFound(v) {
    video = v;
    console.log("[NFL Position Saver] Video found for game: " + gameSlug);

    // Restore position once video has enough data to seek
    if (video.readyState >= 1) {
      restorePosition();
    } else {
      video.addEventListener("loadedmetadata", restorePosition, { once: true });
    }

    // Save position periodically
    saveInterval = setInterval(savePosition, SAVE_INTERVAL_MS);

    // Also save on pause and before page unload
    video.addEventListener("pause", savePosition);
    window.addEventListener("beforeunload", savePosition);
  }

  // Poll for the video element (it may load after the page)
  function waitForVideo() {
    const CHECK_INTERVAL = 500;
    const MAX_ATTEMPTS = 60; // 30 seconds max wait
    let attempts = 0;

    videoChecker = setInterval(function () {
      attempts++;
      // Find the first video with a valid source (the main player)
      const videos = document.querySelectorAll("video");
      for (const v of videos) {
        if ((v.src || v.currentSrc) && v.duration > 0) {
          clearInterval(videoChecker);
          videoChecker = null;
          onVideoFound(v);
          return;
        }
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(videoChecker);
        videoChecker = null;
        console.log("[NFL Position Saver] No video element found after " + MAX_ATTEMPTS * CHECK_INTERVAL / 1000 + "s");
      }
    }, CHECK_INTERVAL);
  }

  function cleanup() {
    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }
    if (videoChecker) {
      clearInterval(videoChecker);
      videoChecker = null;
    }
    if (video) {
      video.removeEventListener("pause", savePosition);
    }
    video = null;
    hasRestored = false;
  }

  function initialize() {
    const newSlug = getGameSlug();
    if (newSlug === gameSlug && video) return; // same game, already running

    // Save position for the old game before switching
    if (video && gameSlug) {
      savePosition();
    }

    cleanup();
    gameSlug = newSlug;

    if (!gameSlug) {
      storageKey = null;
      console.log("[NFL Position Saver] Not a game page, inactive");
      return;
    }

    storageKey = "nfl_position_" + gameSlug;
    console.log("[NFL Position Saver] Initializing for game: " + gameSlug);
    waitForVideo();
  }

  // Detect SPA navigation by monitoring URL changes
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(function () {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log("[NFL Position Saver] URL changed, reinitializing");
      initialize();
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Listen for save requests from the popup
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "savePosition") {
      // Use current URL's slug, not the cached one, in case of SPA nav
      const currentSlug = getGameSlug();
      const currentKey = currentSlug ? "nfl_position_" + currentSlug : null;

      const videos = document.querySelectorAll("video");
      let v = video;
      // If the content script hasn't found the video yet, try to find one now
      if (!v) {
        for (const candidate of videos) {
          if ((candidate.src || candidate.currentSrc) && candidate.duration > 0) {
            v = candidate;
            break;
          }
        }
      }
      if (!v || !v.currentTime) {
        sendResponse({ success: false, error: "No video found on this page" });
        return;
      }
      if (!currentKey) {
        sendResponse({ success: false, error: "Not an NFL game page" });
        return;
      }
      const time = v.currentTime;
      const data = {
        time: time,
        duration: v.duration,
        slug: currentSlug,
        url: window.location.href,
        savedAt: new Date().toISOString(),
      };
      chrome.storage.local.set({ [currentKey]: data }, function () {
        sendResponse({ success: true, data: data });
      });
      return true; // keep message channel open for async sendResponse
    }
  });

  // Initial run
  initialize();
})();
