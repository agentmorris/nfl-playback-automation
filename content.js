// NFL Playback Position Saver - Content Script
// Runs on nfl.com/plus/games/* pages

(function () {
  "use strict";

  // Extract game slug from URL, e.g. "broncos-at-ravens-2009-reg-8"
  function getGameSlug() {
    const match = window.location.pathname.match(/\/plus\/games\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  const gameSlug = getGameSlug();
  if (!gameSlug) return;

  const STORAGE_KEY = "nfl_position_" + gameSlug;
  const SAVE_INTERVAL_MS = 5000;
  const MIN_POSITION_TO_SAVE = 5; // Don't save if less than 5 seconds in

  let video = null;
  let saveInterval = null;
  let hasRestored = false;

  function savePosition() {
    if (!video || video.paused && hasRestored) return;
    const time = video.currentTime;
    if (time < MIN_POSITION_TO_SAVE) return;

    chrome.storage.local.set({
      [STORAGE_KEY]: {
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

    chrome.storage.local.get(STORAGE_KEY, function (result) {
      const data = result[STORAGE_KEY];
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

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }
    return m + ":" + String(s).padStart(2, "0");
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

    const checker = setInterval(function () {
      attempts++;
      // Find the first video with a valid source (the main player)
      const videos = document.querySelectorAll("video");
      for (const v of videos) {
        if ((v.src || v.currentSrc) && v.duration > 0) {
          clearInterval(checker);
          onVideoFound(v);
          return;
        }
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(checker);
        console.log("[NFL Position Saver] No video element found after " + MAX_ATTEMPTS * CHECK_INTERVAL / 1000 + "s");
      }
    }, CHECK_INTERVAL);
  }

  waitForVideo();
})();
