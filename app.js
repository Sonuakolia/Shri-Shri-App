const $ = (s) => document.querySelector(s);

const state = {
  user: null,
  videos: [],
  likes: [],
  subs: [],
  history: []
};

/* =========================
   DATABASE
========================= */

const DB_NAME = "ShriShriDB";
const DB_VERSION = 1;
const STORE_NAME = "videos";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function () {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function saveVideoFile(id, file) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({
      id: id,
      file: file
    });

    tx.oncomplete = function () {
      resolve();
    };

    tx.onerror = function () {
      reject(tx.error);
    };
  });
}

async function getVideoFile(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = function () {
      resolve(request.result || null);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

/* =========================
   LOCAL STORAGE
========================= */

function loadState() {
  try {
    state.user = JSON.parse(
      localStorage.getItem("ss_user") || "null"
    );

    state.videos = JSON.parse(
      localStorage.getItem("ss_videos") || "[]"
    );

    state.likes = JSON.parse(
      localStorage.getItem("ss_likes") || "[]"
    );

    state.subs = JSON.parse(
      localStorage.getItem("ss_subs") || "[]"
    );

    state.history = JSON.parse(
      localStorage.getItem("ss_history") || "[]"
    );
  } catch (e) {
    state.user = null;
    state.videos = [];
    state.likes = [];
    state.subs = [];
    state.history = [];
  }

  if (!state.videos.length) {
    state.videos = [
      {
        id: 1,
        title: "Welcome to Shri Shri",
        channel: "Shri Shri Official",
        description: "Watch • Create • Share",
        views: 0,
        comments: [],
        demo: true
      }
    ];

    saveState();
  }
}

function saveState() {
  localStorage.setItem(
    "ss_user",
    JSON.stringify(state.user)
  );

  localStorage.setItem(
    "ss_videos",
    JSON.stringify(state.videos)
  );

  localStorage.setItem(
    "ss_likes",
    JSON.stringify(state.likes)
  );

  localStorage.setItem(
    "ss_subs",
    JSON.stringify(state.subs)
  );

  localStorage.setItem(
    "ss_history",
    JSON.stringify(state.history)
  );
}

/* =========================
   HELPERS
========================= */

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function initials(name) {
  return String(name || "SS")
    .split(" ")
    .slice(0, 2)
    .map(function (x) {
      return x.charAt(0);
    })
    .join("")
    .toUpperCase();
}

/* =========================
   VIDEO CARD
========================= */

function videoCard(video) {
  return `
    <div class="video-card" onclick="openVideo(${video.id})">

      <div class="thumb">
        <div class="play-placeholder">▶</div>
      </div>

      <h3>${escapeHtml(video.title)}</h3>

      <p>${escapeHtml(video.channel)}</p>

      <small>${video.views || 0} views</small>

    </div>
  `;
}

/* =========================
   HOME
========================= */

function render
