const $ = (selector) => document.querySelector(selector);

const state = {
  user: null,
  videos: [],
  likes: [],
  subs: [],
  history: []
};

const DB_NAME = "ShriShriVideoDB";
const DB_VERSION = 1;
const VIDEO_STORE = "videoFiles";

/* =========================
   INDEXED DB
========================= */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, {
          keyPath: "id"
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideoFile(id, file, thumbnail) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, "readwrite");
    const store = tx.objectStore(VIDEO_STORE);

    store.put({
      id,
      file,
      thumbnail
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getVideoFile(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, "readonly");
    const store = tx.objectStore(VIDEO_STORE);

    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================
   LOCAL STATE
========================= */

function loadState() {
  try {
    state.user =
      JSON.parse(localStorage.getItem("ss_user") || "null");

    state.likes =
      JSON.parse(localStorage.getItem("ss_likes") || "[]");

    state.subs =
      JSON.parse(localStorage.getItem("ss_subs") || "[]");

    state.history =
      JSON.parse(localStorage.getItem("ss_history") || "[]");

    state.videos =
      JSON.parse(localStorage.getItem("ss_videos") || "[]");
  } catch (e) {
    state.user = null;
    state.likes = [];
    state.subs = [];
    state.history = [];
    state.videos = [];
  }

  if (!state.videos.length) {
    state.videos = [
      {
        id: 1,
        title: "Welcome to Shri Shri",
        channel: "Shri Shri Official",
        description:
          "Welcome to Shri Shri. Watch, create and share videos.",
        views: 1,
        comments: [],
        demo: true,
        thumbnail: ""
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

  localStorage.setItem(
    "ss_videos",
    JSON.stringify(state.videos)
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
    .map(x => x.charAt(0))
    .join("")
    .toUpperCase();
}

/* =========================
   VIDEO CARD
========================= */

function videoCard(video) {
  return `
    <div
      class="video-card"
      onclick="openVideo(${video.id})"
    >

      <div class="thumb">

        ${
          video.thumbnail
            ? `
              <img
                src="${video.thumbnail}"
                alt="${escapeHtml(video.title)}"
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                "
              >
            `
            : `
              <div class="play-placeholder">
                ▶
              </div>
            `
        }

      </div>

      <h3>
        ${escapeHtml(video.title)}
      </h3>

      <p>
        ${escapeHtml(video.channel)}
      </p>

      <small>
        ${video.views || 0} views
      </small>

    </div>
  `;
}

/* =========================
   HOME
========================= */

function renderHome(list = state.videos) {
  $("#app").innerHTML = `
    <section class="hero">

      <h1>
        Shri Shri
      </h1>

      <p>
        Watch • Create • Share
      </p>

    </section>

    <h2>
      Recommended
    </h2>

    <div class="feed">

      ${
        list.length
          ? list.map(videoCard).join("")
          : `
            <p>
              No videos found.
            </p>
          `
      }

    </div>
  `;
}

/* =========================
   SEARCH
========================= */

function searchVideos() {
  const input = $("#q");

  if (!input) return;

  const query =
    input.value.trim().toLowerCase();

  if (!query) {
    renderHome();
    return;
  }

  const results =
    state.videos.filter(video =>
      String(video.title)
        .toLowerCase()
        .includes(query) ||

      String(video.channel)
        .toLowerCase()
        .includes(query) ||

      String(video.description || "")
        .toLowerCase()
        .includes(query)
    );

  renderHome(results);
}

/* =========================
   OPEN VIDEO
========================= */

async function openVideo(id) {
  const video =
    state.videos.find(v => v.id === id);

  if (!video) return;

  let runtimeUrl = "";

  if (!video.demo) {
    try {
      const saved =
        await getVideoFile(id);

      if (!saved || !saved.file) {
        alert(
          "Video file nahi mili. Is video ko ek baar dobara upload karein."
        );

        return;
      }

      runtimeUrl =
        URL.createObjectURL(saved.file);

    } catch (error) {
      alert(
        "Video open nahi ho pa rahi."
      );

      return;
    }
  }

  video.views =
    (video.views || 0) + 1;

  state.history = [
    id,
    ...state.history.filter(x => x !== id)
  ].slice(0, 50);

  saveState();

  const liked =
    state.likes.includes(id);

  const subscribed =
    state.subs.includes(video.channel);

  $("#app").innerHTML = `
    <div class="player-page">

      ${
        runtimeUrl
          ? `
            <video
              class="player"
              src="${runtimeUrl}"
              controls
              autoplay
              playsinline
            ></video>
          `
          : `
            <div
              class="player empty-player"
            >
              ▶
            </div>
          `
      }

      <h2>
        ${escapeHtml(video.title)}
      </h2>

      <p>
        ${video.views} views
      </p>

      <div class="actions">

        <button
          onclick="toggleLike(${id})"
        >
          ${liked ? "👍 Liked" : "👍 Like"}
        </button>

        <button
          onclick="shareVideo(${id})"
        >
          ↗ Share
        </button>

      </div>

      <div class="channel-row">

        <div>
          <strong>
            ${escapeHtml(video.channel)}
          </strong>
        </div>

        <button
          class="primary"
          onclick="toggleSubscribe(${id})"
        >
          ${
            subscribed
              ? "Subscribed"
              : "Subscribe"
          }
        </button>

      </div>

      <p>
        ${escapeHtml(
          video.description || ""
        )}
      </p>

      <h3>
        Comments
      </h3>

      ${
        state.user
          ? `
            <div class="comment-box">

              <input
                id="commentText"
                placeholder="Add a comment"
              >

              <button
                onclick="addComment(${id})"
              >
                Comment
              </button>

            </div>
          `
          : `
            <p>
              Please login to comment.
            </p>
          `
      }

      <div>

        ${
          (video.comments || []).length
            ? video.comments
                .map(comment => `
                  <div class="comment">

                    <b>
                      ${escapeHtml(comment.user)}
                    </b>

                    <p>
                      ${escapeHtml(comment.text)}
                    </p>

                  </div>
                `)
                .join("")
            : `
              <p>
                No comments yet.
              </p>
            `
        }

      </div>

    </div>
  `;
}

/* =========================
   LIKE
========================= */

function toggleLike(id) {
  if (state.likes.includes(id)) {
    state.likes =
      state.likes.filter(x => x !== id);
  } else {
    state.likes.push(id);
  }

  saveState();
  openVideo(id);
}

/* =========================
   SUBSCRIBE
========================= */

function toggleSubscribe(id) {
  const video =
    state.videos.find(v => v.id === id);

  if (!video) return;

  const channel =
    video.channel;

  if (state.subs.includes(channel)) {
    state.subs =
      state.subs.filter(x => x !== channel);
  } else {
    state.subs.push(channel);
  }

  saveState();
  openVideo(id);
}

/* =========================
   COMMENT
========================= */

function addComment(id) {
  if (!state.user) {
    renderLogin(
      "Please login first."
    );

    return;
  }

  const input =
    $("#commentText");

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) return;

  const video =
    state.videos.find(v => v.id === id);

  if (!video) return;

  video.comments =
    video.comments || [];

  video.comments.unshift({
    user: state.user.name,
    text
  });

  saveState();
  openVideo(id);
}

/* =========================
   SHARE
========================= */

function shareVideo(id) {
  const video =
    state.videos.find(v => v.id === id);

  if (!video) return;

  const text =
    `${video.title} - Shri Shri`;

  if (
    window.AndroidShare &&
    window.AndroidShare.share
  ) {
    window.AndroidShare.share(text);

  } else if (navigator.share) {

    navigator.share({
      title: video.title,
      text
    }).catch(() => {});

  } else {

    alert(
      "Share is not available."
    );
  }
}

/* =========================
   UPLOAD PAGE
========================= */

function renderUpload() {
  if (!state.user) {
    renderLogin(
      "Login or create an account before uploading."
    );

    return;
  }

  $("#app").innerHTML = `
    <h2>
      Upload Video
    </h2>

    <div class="form">

      <label>
        Video title
      </label>

      <input
        id="videoTitle"
        placeholder="Enter video title"
      >

      <label>
        Select video
      </label>

      <input
        id="videoFile"
        type="file"
        accept="video/*"
      >

      <label>
        Description
      </label>

      <textarea
        id="videoDescription"
        placeholder="Tell viewers about your video"
      ></textarea>

      <button
        class="primary"
        onclick="publishVideo()"
      >
        Publish Video
      </button>

    </div>
  `;
}

/* =========================
   THUMBNAIL
========================= */

function makeThumbnail(file) {
  return new Promise(resolve => {

    const video =
      document.createElement("video");

    const canvas =
      document.createElement("canvas");

    const url =
      URL.createObjectURL(file);

    let finished = false;

    function finish(value) {
      if (finished) return;

      finished = true;

      try {
        URL.revokeObjectURL(url);
      } catch (e) {}

      resolve(value || "");
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      try {
        let seekTime = 0.3;

        if (
          Number.isFinite(video.duration) &&
          video.duration > 1
        ) {
          seekTime =
            Math.min(
              1,
              video.duration * 0.1
            );
        }

        video.currentTime =
          seekTime;

      } catch (e) {
        finish("");
      }
    };

    video.onseeked = () => {
      try {
        const width =
          video.videoWidth || 640;

        const height =
          video.videoHeight || 360;

        const targetWidth =
          Math.min(640, width);

        const ratio =
          height / width;

        canvas.width =
          targetWidth;

        canvas.height =
          Math.round(
            targetWidth * ratio
          );

        const ctx =
          canvas.getContext("2d");

        ctx.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const thumbnail =
          canvas.toDataURL(
            "image/jpeg",
            0.75
          );

        finish(thumbnail);

      } catch (e) {
        finish("");
      }
    };

    video.onerror = () => {
      finish("");
    };

    setTimeout(() => {
      finish("");
    }, 8000);
  });
}

/* =========================
   PUBLISH VIDEO
========================= */

async function publishVideo() {
  const titleInput =
    $("#videoTitle");

  const fileInput =
    $("#videoFile");

  const descriptionInput =
    $("#videoDescription");

  if (!titleInput || !fileInput) {
    return;
  }

  const title =
    titleInput.value.trim();

  const file =
    fileInput.files[0];

  const description =
    descriptionInput
      ? descriptionInput.value.trim()
      : "";

  if (!title) {
    alert(
      "Please enter video title."
    );

    return;
  }

  if (!file) {
    alert(
      "Please select a video."
    );

    return;
  }

  try {
    const id =
      Date.now();

    const button =
      document.querySelector(
        ".form .primary"
      );

    if (button) {
      button.disabled = true;
      button.innerText =
        "Uploading...";
    }

    const thumbnail =
      await makeThumbnail(file);

    await saveVideoFile(
      id,
      file,
      thumbnail
    );

    const video = {
      id,
      title,
      channel: state.user.name,
      description,
      views: 0,
      comments: [],
      thumbnail,
      demo: false
    };

    state.videos.unshift(video);

    saveState();

    alert(
      "Video uploaded successfully."
    );

    renderHome();

  } catch (error) {

    console.error(error);

    alert(
      "Video save nahi ho pa rahi. Chhoti video se dobara try karein."
    );
  }
}

/* =========================
   LOGIN
========================= */

function renderLogin(message = "") {
  $("#app").innerHTML = `
    <h2>
      Login / Signup
    </h2>

    ${
      message
        ? `
          <div class="form">
            ${escapeHtml(message)}
          </div>
        `
        : ""
    }

    <div class="auth">

      <h2>
        Welcome to Shri Shri
      </h2>

      <input
        id="loginName"
        placeholder="Your channel name"
      >

      <input
        id="loginEmail"
        type="email"
        placeholder="Email"
      >

      <button
        class="primary"
        onclick="login()"
      >
        Login / Create Account
      </button>

    </div>
  `;
}

function login() {
  const nameInput =
    $("#loginName");

  const emailInput =
    $("#loginEmail");

  if (!nameInput || !emailInput) {
    return;
  }

  const name =
    nameInput.value.trim();

  const email =
    emailInput.value.trim();

  if (!name || !email) {
    alert(
      "Please enter name and email."
    );

    return;
  }

  state.user = {
    name,
    email,
    created: Date.now()
  };

  saveState();

  renderProfile();
}

/* =========================
   LOGOUT
========================= */

function logout() {
  state.user = null;

  saveState();

  renderHome();
}

/* =========================
   PROFILE
========================= */

function renderProfile() {
  if (!state.user) {
    renderLogin();
    return;
  }

  const ownVideos =
    state.videos.filter(
      video =>
        video.channel ===
        state.user.name
    );

  $("#app").innerHTML = `
    <div class="profile">

      <div class="avatar">
        ${initials(state.user.name)}
      </div>

      <h2>
        ${escapeHtml(state.user.name)}
      </h2>

      <p>
        ${escapeHtml(state.user.email)}
      </p>

      <p>
        ${ownVideos.length} videos
      </p>

      <button
        onclick="renderMyVideos()"
      >
        My Videos
      </button>

      <button
        onclick="renderHistory()"
      >
        Watch History
      </button>

      <button
        onclick="renderSubscriptions()"
      >
        Subscriptions
      </button>

      <button
        onclick="logout()"
      >
        Logout
      </button>

    </div>
  `;
}

/* =========================
   MY VIDEOS
========================= */

function renderMyVideos() {
  if (!state.user) {
    renderLogin();
    return;
  }

  const videos =
    state.videos.filter(
      video =>
        video.channel ===
        state.user.name
    );

  $("#app").innerHTML = `
    <h2>
      My Videos
    </h2>

    <div class="feed">

      ${
        videos.length
          ? videos.map(videoCard).join("")
          : `
            <p>
              No videos uploaded yet.
            </p>
          `
      }

    </div>
  `;
}

/* =========================
   SUBSCRIPTIONS
========================= */

function renderSubscriptions() {
  const videos =
    state.videos.filter(
      video =>
        state.subs.includes(
          video.channel
        )
    );

  $("#app").innerHTML = `
    <h2>
      Subscriptions
    </h2>

    <div class="feed">

      ${
        videos.length
          ? videos.map(videoCard).join("")
          : `
            <p>
              No subscribed videos yet.
            </p>
          `
      }

    </div>
  `;
}

/* =========================
   SHORTS
========================= */

function renderShorts() {
  $("#app").innerHTML = `
    <h2>
      Shorts
    </h2>

    <div class="shorts-feed">

      ${
        state.videos.length
          ? state.videos.map(videoCard).join("")
          : `
            <p>
              No Shorts available.
            </p>
          `
      }

    </div>
  `;
}

/* =========================
   HISTORY
========================= */

function renderHistory() {
  const videos =
    state.history
      .map(id =>
        state.videos.find(
          video =>
            video.id === id
        )
      )
      .filter(Boolean);

  $("#app").innerHTML = `
    <h2>
      Watch History
    </h2>

    <div class="feed">

      ${
        videos.length
          ? videos.map(videoCard).join("")
          : `
            <p>
              No watch history yet.
            </p>
          `
      }

    </div>
  `;
}

/* =========================
   NAVIGATION
========================= */

function go(page) {
  if (page === "home") {
    renderHome();
    return;
  }

  if (page === "shorts") {
    renderShorts();
    return;
  }

  if (page === "upload") {
    renderUpload();
    return;
  }

  if (page === "subs") {
    renderSubscriptions();
    return;
  }

  if (
    page === "you" ||
    page === "profile"
  ) {
    renderProfile();
    return;
  }
}

/* =========================
   START APP
========================= */

loadState();
renderHome();
