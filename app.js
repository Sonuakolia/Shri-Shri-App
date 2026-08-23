const $ = (selector) => document.querySelector(selector);

const state = {
  user: null,
  videos: [],
  likes: [],
  subs: [],
  history: []
};

function loadState() {
  try {
    state.user = JSON.parse(localStorage.getItem("ss_user") || "null");
    state.likes = JSON.parse(localStorage.getItem("ss_likes") || "[]");
    state.subs = JSON.parse(localStorage.getItem("ss_subs") || "[]");
    state.history = JSON.parse(localStorage.getItem("ss_history") || "[]");
    state.videos = JSON.parse(localStorage.getItem("ss_videos") || "[]");
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
        description: "Welcome to Shri Shri. Watch, create and share videos.",
        views: 1,
        comments: [],
        demo: true
      }
    ];

    saveState();
  }
}

function saveState() {
  localStorage.setItem("ss_user", JSON.stringify(state.user));
  localStorage.setItem("ss_likes", JSON.stringify(state.likes));
  localStorage.setItem("ss_subs", JSON.stringify(state.subs));
  localStorage.setItem("ss_history", JSON.stringify(state.history));

  const safeVideos = state.videos.map(v => ({
    id: v.id,
    title: v.title,
    channel: v.channel,
    description: v.description || "",
    views: v.views || 0,
    comments: v.comments || [],
    demo: !!v.demo
  }));

  localStorage.setItem("ss_videos", JSON.stringify(safeVideos));
}

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

function videoCard(v) {
  return `
    <div class="video-card" onclick="openVideo(${v.id})">

      <div class="thumb">
        ${
          v.runtimeUrl
            ? `<video src="${v.runtimeUrl}" muted preload="metadata"></video>`
            : `<div class="play-placeholder">▶</div>`
        }
      </div>

      <h3>${escapeHtml(v.title)}</h3>

      <p>${escapeHtml(v.channel)}</p>

      <small>${v.views || 0} views</small>

    </div>
  `;
}

function renderHome(list = state.videos) {
  $("#app").innerHTML = `
    <section class="hero">
      <h1>Shri Shri</h1>
      <p>Watch • Create • Share</p>
    </section>

    <h2>Recommended</h2>

    <div class="feed">
      ${
        list.length
          ? list.map(videoCard).join("")
          : `<p>No videos found.</p>`
      }
    </div>
  `;
}

function searchVideos() {
  const input = $("#q");

  if (!input) return;

  const q = input.value.trim().toLowerCase();

  if (!q) {
    renderHome();
    return;
  }

  const results = state.videos.filter(v =>
    String(v.title).toLowerCase().includes(q) ||
    String(v.channel).toLowerCase().includes(q) ||
    String(v.description || "").toLowerCase().includes(q)
  );

  renderHome(results);
}

function openVideo(id) {
  const video = state.videos.find(v => v.id === id);

  if (!video) return;

  video.views = (video.views || 0) + 1;

  state.history = [
    id,
    ...state.history.filter(x => x !== id)
  ].slice(0, 50);

  saveState();

  const liked = state.likes.includes(id);
  const subscribed = state.subs.includes(video.channel);

  $("#app").innerHTML = `
    <div class="player-page">

      ${
        video.runtimeUrl
          ? `<video class="player" src="${video.runtimeUrl}" controls autoplay></video>`
          : `<div class="player empty-player">▶</div>`
      }

      <h2>${escapeHtml(video.title)}</h2>

      <p>${video.views} views</p>

      <div class="actions">

        <button onclick="toggleLike(${id})">
          ${liked ? "👍 Liked" : "👍 Like"}
        </button>

        <button onclick="shareVideo(${id})">
          ↗ Share
        </button>

      </div>

      <div class="channel-row">

        <div>
          <strong>${escapeHtml(video.channel)}</strong>
        </div>

        <button
          class="primary"
          onclick="toggleSubscribe(${id})"
        >
          ${subscribed ? "Subscribed" : "Subscribe"}
        </button>

      </div>

      <p>${escapeHtml(video.description || "")}</p>

      <h3>Comments</h3>

      ${
        state.user
          ? `
            <div class="comment-box">
              <input
                id="commentText"
                placeholder="Add a comment"
              >
              <button onclick="addComment(${id})">
                Comment
              </button>
            </div>
          `
          : `<p>Please login to comment.</p>`
      }

      <div>
        ${
          (video.comments || []).length
            ? video.comments.map(c => `
                <div class="comment">
                  <b>${escapeHtml(c.user)}</b>
                  <p>${escapeHtml(c.text)}</p>
                </div>
              `).join("")
            : `<p>No comments yet.</p>`
        }
      </div>

    </div>
  `;
}

function toggleLike(id) {
  if (state.likes.includes(id)) {
    state.likes = state.likes.filter(x => x !== id);
  } else {
    state.likes.push(id);
  }

  saveState();
  openVideo(id);
}

function toggleSubscribe(id) {
  const video = state.videos.find(v => v.id === id);

  if (!video) return;

  const channel = video.channel;

  if (state.subs.includes(channel)) {
    state.subs = state.subs.filter(x => x !== channel);
  } else {
    state.subs.push(channel);
  }

  saveState();
  openVideo(id);
}

function addComment(id) {
  if (!state.user) {
    renderLogin("Please login first.");
    return;
  }

  const input = $("#commentText");

  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  const video = state.videos.find(v => v.id === id);

  if (!video) return;

  video.comments = video.comments || [];

  video.comments.unshift({
    user: state.user.name,
    text
  });

  saveState();
  openVideo(id);
}

function shareVideo(id) {
  const video = state.videos.find(v => v.id === id);

  if (!video) return;

  const text = `${video.title} - Shri Shri`;

  if (navigator.share) {
    navigator.share({
      title: video.title,
      text
    }).catch(() => {});
  } else {
    alert(text);
  }
}

function renderUpload() {
  if (!state.user) {
    renderLogin("Login or create an account before uploading.");
    return;
  }

  $("#app").innerHTML = `
    <h2>Upload Video</h2>

    <div class="form">

      <label>Video title</label>
      <input
        id="videoTitle"
        placeholder="Enter video title"
      >

      <label>Select video</label>
      <input
        id="videoFile"
        type="file"
        accept="video/*"
      >

      <label>Description</label>
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

function publishVideo() {
  const titleInput = $("#videoTitle");
  const fileInput = $("#videoFile");
  const descInput = $("#videoDescription");

  if (!titleInput || !fileInput) return;

  const title = titleInput.value.trim();
  const file = fileInput.files[0];
  const description = descInput ? descInput.value.trim() : "";

  if (!title) {
    alert("Please enter video title.");
    return;
  }

  if (!file) {
    alert("Please select a video.");
    return;
  }

  const runtimeUrl = URL.createObjectURL(file);

  const video = {
    id: Date.now(),
    title,
    channel: state.user.name,
    description,
    views: 0,
    comments: [],
    runtimeUrl
  };

  state.videos.unshift(video);

  saveState();

  alert("Video added successfully.");

  renderHome();
}

function renderLogin(message = "") {
  $("#app").innerHTML = `
    <h2>Login / Signup</h2>

    ${
      message
        ? `<div class="form">${escapeHtml(message)}</div>`
        : ""
    }

    <div class="auth">

      <h2>Welcome to Shri Shri</h2>

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
  const nameInput = $("#loginName");
  const emailInput = $("#loginEmail");

  if (!nameInput || !emailInput) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || !email) {
    alert("Please enter name and email.");
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

function logout() {
  state.user = null;

  saveState();

  renderHome();
}

function renderProfile() {
  if (!state.user) {
    renderLogin();
    return;
  }

  const ownVideos = state.videos.filter(
    v => v.channel === state.user.name
  );

  $("#app").innerHTML = `
    <div class="profile">

      <div class="avatar">
        ${initials(state.user.name)}
      </div>

      <h2>${escapeHtml(state.user.name)}</h2>

      <p>${escapeHtml(state.user.email)}</p>

      <p>
        ${ownVideos.length} videos
      </p>

      <button onclick="renderMyVideos()">
        My Videos
      </button>

      <button onclick="renderHistory()">
        Watch History
      </button>

      <button onclick="renderSubscriptions()">
        Subscriptions
      </button>

      <button onclick="logout()">
        Logout
      </button>

    </div>
  `;
}

function renderMyVideos() {
  if (!state.user) {
    renderLogin();
    return;
  }

  const videos = state.videos.filter(
    v => v.channel === state.user.name
  );

  $("#app").innerHTML = `
    <h2>My Videos</h2>

    <div class="feed">
      ${
        videos.length
          ? videos.map(videoCard).join("")
          : `<p>No videos uploaded yet.</p>`
      }
    </div>
  `;
}

function renderSubscriptions() {
  const videos = state.videos.filter(
    v => state.subs.includes(v.channel)
  );

  $("#app").innerHTML = `
    <h2>Subscriptions</h2>

    <div class="feed">
      ${
        videos.length
          ? videos.map(videoCard).join("")
          : `<p>No subscribed videos yet.</p>`
      }
    </div>
  `;
}

function renderShorts() {
  $("#app").innerHTML = `
    <h2>Shorts</h2>

    <div class="shorts-feed">
      ${
        state.videos.length
          ? state.videos.map(videoCard).join("")
          : `<p>No Shorts available.</p>`
      }
    </div>
  `;
}

function renderHistory() {
  const videos = state.history
    .map(id => state.videos.find(v => v.id === id))
    .filter(Boolean);

  $("#app").innerHTML = `
    <h2>Watch History</h2>

    <div class="feed">
      ${
        videos.length
          ? videos.map(videoCard).join("")
          : `<p>No watch history yet.</p>`
      }
    </div>
  `;
}

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

  if (page === "you" || page === "profile") {
    renderProfile();
    return;
  }
}

loadState();
renderHome();
