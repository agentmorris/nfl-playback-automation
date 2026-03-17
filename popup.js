// NFL Playback Position Saver - Popup Script

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  return m + ":" + String(s).padStart(2, "0");
}

function slugToTitle(slug) {
  // "broncos-at-ravens-2009-reg-8" -> "Broncos at Ravens (2009 Reg 8)"
  const parts = slug.split("-");
  const atIdx = parts.indexOf("at");
  if (atIdx === -1) return slug;

  const away = parts.slice(0, atIdx).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  // Find where the year starts (4-digit number)
  let yearIdx = -1;
  for (let i = atIdx + 1; i < parts.length; i++) {
    if (/^\d{4}$/.test(parts[i])) {
      yearIdx = i;
      break;
    }
  }

  let home, info;
  if (yearIdx > -1) {
    home = parts.slice(atIdx + 1, yearIdx).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    info = parts.slice(yearIdx).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } else {
    home = parts.slice(atIdx + 1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    info = "";
  }

  return away + " at " + home + (info ? " (" + info + ")" : "");
}

function renderGames() {
  chrome.storage.local.get(null, function (items) {
    const container = document.getElementById("games");
    const entries = [];

    for (const key in items) {
      if (key.startsWith("nfl_position_")) {
        entries.push(items[key]);
      }
    }

    if (entries.length === 0) {
      container.innerHTML = '<div class="empty">No saved positions yet. Watch a game on NFL+ and your position will be saved automatically.</div>';
      return;
    }

    // Sort by most recently saved
    entries.sort(function (a, b) {
      return new Date(b.savedAt) - new Date(a.savedAt);
    });

    container.innerHTML = "";
    entries.forEach(function (entry) {
      const div = document.createElement("div");
      div.className = "game";

      const progress = entry.duration
        ? " / " + formatTime(entry.duration) + " (" + Math.round((entry.time / entry.duration) * 100) + "%)"
        : "";

      const saved = new Date(entry.savedAt);
      const timeAgo = getTimeAgo(saved);

      div.innerHTML =
        '<div class="game-name">' + slugToTitle(entry.slug) + "</div>" +
        '<div class="game-time">Position: ' + formatTime(entry.time) + progress + "</div>" +
        '<div class="game-time">Saved: ' + timeAgo + "</div>" +
        '<div class="game-actions">' +
        '<a href="' + entry.url + '" target="_blank">Open game</a>' +
        '<button data-key="nfl_position_' + entry.slug + '">Remove</button>' +
        "</div>";

      container.appendChild(div);
    });

    // Bind remove buttons
    container.querySelectorAll("button[data-key]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        chrome.storage.local.remove(btn.dataset.key, renderGames);
      });
    });
  });
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days + "d ago";
}

renderGames();
