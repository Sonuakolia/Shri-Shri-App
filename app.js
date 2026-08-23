const $ = s => document.querySelector(s);

const state = {
  videos: [],
  user: JSON.parse(localStorage.getItem("ss_user") || "null"),
  likes: JSON.parse(localStorage.getItem("ss_likes") || "[]"),
  subs: JSON.parse(localStorage.getItem("ss_subs") || "[]"),
  history: JSON.parse(localStorage.getItem("ss_history") || "[]")
};

function save() {
  localStorage.setItem("ss_user", JSON.stringify(state.user));
  localStorage.setItem("ss_likes", JSON.stringify(state.likes));
  localStorage.setItem("ss_subs", JSON.stringify(state.subs));
  localStorage.setItem("ss_history", JSON.stringify(state.history));
  localStorage.setItem("ss_videos", JSON.stringify(state.videos));
}

function loadVideos() {
  try {
    state.videos = JSON.parse(localStorage.getItem("ss_videos") || "[]");
  } catch {
    state.videos = [];
  }

  if (!state.videos.length) {
    state.videos = [{
      id: 1,
      title: "Welcome to Shri Shri",
      channel: "Shri Shri Official",
      description: "Welcome to Shri Shri video platform.",
      views: 1,
      url: "",
      comments: []
    }];
    save();
  }
}

function videoCard(v) {
  return `
    <div class="video-card" onclick="openVideo(${v.id})">
      <div class="thumb">
        ${v.url
          ? `<video src="${v.url}" muted preload="metadata"></video>`
          : `<div class="play-placeholder">▶</div>`}
      </div>
      <h3>${escapeHtml(v.title)}</h3>
      <p>${escapeHtml(v.channel)}</p>
      <small>${v.views || 0} views</small>
    </div>
  `;
}

function renderHome(list = state.videos) {
  $("#app").innerHTML = `
    <div class="hero">
      <h1>Shri Shri</h1>
      <p>Watch • Create • Share</p>
    </div>

    <h2>Recommended</h2>

    <div class="feed">
      ${list.length
        ? list.map(videoCard).join("")
        : `<p>No videos found.</p>`}
    </div>
  `;
}

function searchVideos() {
  const q = ($("#q")?.value || "").trim().toLowerCase();

  if (!q) {
    renderHome();
    return;
  }

  const result = state.videos.filter(v =>
    v.title.toLowerCase().includes(q) ||
    v.channel.toLowerCase().includes(q)
  );

  renderHome(result);
}

function openVideo(id) {
  const v = state.videos.find(x => x.id === id);
  if (!v) return;

  v.views = (v.views || 0) + 1;

  state.history = state.history.filter(x => x !== id);
  state.history.unshift(id);
  state.history = state.history.slice(0, 50);

  save();

  const liked = state.likes.includes(id);
  const subscribed = state.subs.includes(v.channel);

  $("#app").innerHTML = `
    <div class="player-page">

      ${
        v.url
          ? `<video class="player" src="${v.url}" controls autoplay></video>`
          : `<div class="player empty-player">▶</div>`
      }

      <h2>${escapeHtml(v.title)}</h2>

      <p>${v.views} views</p>

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
          <strong>${escapeHtml(v.channel)}</strong>
        </div>

        <button class="primary"
          onclick="toggleSubscribe('${safeJS(v.channel)}')">
          ${subscribed ? "Subscribed" : "Subscribe"}
        </button>
      </div>

      <p>${escapeHtml(v.description || "")}</p>

      <hr>

      <h3>Comments</h3>

      ${
        state.user
          ? `
            <div class="comment-box">
              <input id="commentText" placeholder="Add a comment">
              <button onclick="addComment(${id})">Comment</button>
            </div>
          `
          : `<p>Login to comment.</p>`
      }

      <div class="comments">
        ${(v.comments || []).map(c => `
          <div class="comment">
            <b>${escapeHtml(c.user)}</b>
            <p>${escapeHtml(c.text)}</p>
          </div>
        `).join("")}
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

  save();
  openVideo(id);
}

function toggleSubscribe(channel) {
  if (state.subs.includes(channel)) {
    state.subs = state.subs.filter(x => x !== channel);
  } else {
    state.subs.push(channel);
  }

  save();
  renderSubscriptions();
}

function addComment(id) {
  if (!state.user) {
    renderLogin();
    return;
  }

  const input = $("#commentText");
  const text = input.value.trim();

  if (!text) return;

  const v = state.videos.find(x => x.id === id);

  v.comments = v.comments || [];

  v.comments.unshift({
    user: state.user.name,
    text: text
  });

  save();
  openVideo(id);
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
      <input id="videoTitle"
        placeholder="Enter video title">

      <label>Select video</label>
      <input id="videoFile"
        type="file"
        accept="video/*">

      <label>Description</label>
      <textarea id="videoDescription"
        placeholder="Tell viewers about your video"></textarea>

      <button class="primary"
        onclick="publishVideo()">
        Publish Video
      </button>

    </div>
  `;
}

function publishVideo() {
  const title = $("#videoTitle").value.trim();
  const file = $("#videoFile").files[0];
  const description = $("#videoDescription").value.trim();

  if (!title || !file) {
    alert("Please enter title and choose a video.");
    return;
  }

  const url = URL.createObjectURL(file);

  const video = {
    id: Date.now(),
    title,
    channel: state.user.name,
    description,
    views: 0,
    url,
    comments: []
  };

  state.videos.unshift(video);

  save();

  alert("Video added successfully.");
  renderHome();
}

function renderLogin(message = "") {
  $("#app").innerHTML = `
    <div class="auth">

      <h2>Welcome to Shri Shri</h2>

      ${message ? `<p>${escapeHtml(message)}</p>` : ""}

      <input id="loginName"
        placeholder="Your name">

      <input id="loginEmail"
        type="email"
        placeholder="Email">

      <button class="primary"
        onclick="login()">
        Login / Create Account
      </button>

    </div>
  `;
}

function login() {
  const name = $("#loginName").value.trim();
  const email = $("#loginEmail").value.trim();

  if (!name || !email) {
    alert("Please enter name and email.");
    return;
  }

  state.user = {
    name,
    email,
    created: Date.now()
  };

  save();
  renderProfile();
}

function logout() {
  state.user = null;
  save();
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
        ${ownVideos.length} videos •
        ${state.subs.length} subscriptions
      </p>

      <button onclick="renderHistory()">
        Watch History
      </button>

      <button onclick="
