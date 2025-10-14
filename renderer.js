/* renderer.js - Updated with auto-play on startup */

(() => {
  // UI elements
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const chooseFilesBtn = document.getElementById('chooseFilesBtn');
  const fileInput = document.getElementById('fileInput');
  const loadManifestBtn = document.getElementById('loadManifestBtn');
  const nowPlayingEl = document.getElementById('nowPlaying');
  const bookChapterEl = document.getElementById('bookChapter');
  const playlistEl = document.getElementById('playlist');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const loopToggle = document.getElementById('loopToggle');
  const volumeSlider = document.getElementById('volume');

  // Audio element
  const audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';

  // State
  let playlist = [];
  let index = 0;
  let isPlaying = false;
  let loopEnabled = true;

  // Parse filename to extract book & chapter
  function parseFilename(filename) {
    const base = filename.split('/').pop();
    const name = base.replace(/\.[^/.]+$/, "");
    const match = name.match(/^A(\d+)_+(\d+)_+([A-Za-z0-9]+)_*/);
    if (match) {
      const bookRaw = match[3].replace(/_/g, ' ');
      const chapter = parseInt(match[2], 10);
      return {
        book: bookRaw,
        chapter: chapter,
        title: `${bookRaw} ${chapter}`
      };
    }
    const tokens = name.split(/[_\- ]+/).filter(Boolean);
    if (tokens.length >= 2) {
      return { 
        book: tokens.slice(2).join(' '), 
        chapter: tokens[1], 
        title: tokens.slice(2).join(' ') + " " + tokens[1] 
      };
    }
    return { book: name, chapter: '', title: name };
  }

  function renderPlaylistUI() {
    playlistEl.innerHTML = '';
    playlist.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'item' + (i === index ? ' playing' : '');
      div.innerHTML = `<div>${i+1}. ${item.title}</div><div style="opacity:.7">${item.filename}</div>`;
      div.addEventListener('click', () => {
        index = i;
        loadIndex(index);
        play();
        updateUI();
      });
      playlistEl.appendChild(div);
    });
  }

  function updateNowPlayingUI() {
    if (!playlist.length) {
      nowPlayingEl.textContent = 'Now Playing: –';
      bookChapterEl.textContent = '';
      return;
    }
    const cur = playlist[index];
    nowPlayingEl.textContent = `Now Playing: ${cur.title}`;
    bookChapterEl.textContent = `${cur.book} ${cur.chapter || ''}`.trim();
  }

  function updateUI() {
    updateNowPlayingUI();
    renderPlaylistUI();
    playPauseBtn.textContent = isPlaying ? '⸝ Pause' : '▶ Play';
    playPauseBtn.setAttribute('data-playing', isPlaying ? 'true' : 'false');
    loopToggle.textContent = `Loop: ${loopEnabled ? 'On' : 'Off'}`;
  }

  // Playback controls
  function loadIndex(i) {
    if (!playlist[i]) return;
    audio.src = playlist[i].src;
    audio.load();
    updateNowPlayingUI();
  }

  function play() {
    if (!playlist.length) return;
    audio.play().catch(err => {
      console.warn('Play blocked by autoplay policy', err);
    });
    isPlaying = true;
    updateUI();
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    updateUI();
  }

  function next() {
    if (!playlist.length) return;
    index++;
    if (index >= playlist.length) {
      if (loopEnabled) index = 0;
      else { index = playlist.length - 1; pause(); return; }
    }
    loadIndex(index);
    if (isPlaying) play();
    updateUI();
  }

  function prev() {
    if (!playlist.length) return;
    index--;
    if (index < 0) {
      if (loopEnabled) index = playlist.length - 1;
      else { index = 0; pause(); return; }
    }
    loadIndex(index);
    if (isPlaying) play();
    updateUI();
  }

  // Audio events
  audio.addEventListener('ended', () => {
    setTimeout(() => next(), 150);
  });

  audio.addEventListener('play', () => { isPlaying = true; updateUI(); });
  audio.addEventListener('pause', () => { isPlaying = false; updateUI(); });
  audio.addEventListener('volumechange', () => { volumeSlider.value = Math.round(audio.volume * 100); });

  // Volume control
  volumeSlider.addEventListener('input', (e) => {
    audio.volume = (Number(e.target.value) || 70) / 100;
  });

  // Button controls
  playPauseBtn.addEventListener('click', () => {
    if (isPlaying) pause(); else play();
  });
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  loopToggle.addEventListener('click', () => {
    loopEnabled = !loopEnabled;
    updateUI();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') { ev.preventDefault(); if (isPlaying) pause(); else play(); }
    if (ev.key === 'ArrowRight') next();
    if (ev.key === 'ArrowLeft') prev();
  });

  // Load playlist.json from server
  async function tryLoadManifest() {
    const manifestUrl = 'audio/playlist.json';
    try {
      const r = await fetch(manifestUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error('no manifest');
      const list = await r.json();
      playlist = list.map(fn => {
        const filename = fn.split('/').pop();
        const meta = parseFilename(filename);
        return { src: `audio/${fn}`, filename, ...meta };
      });
      playlist.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
      index = 0;
      loadIndex(index);
      renderPlaylistUI();
      updateUI();
      return true;
    } catch (err) {
      console.warn('No server manifest found:', err);
      return false;
    }
  }

  // Local file input
  fileInput.addEventListener('change', (ev) => {
    const files = Array.from(ev.target.files).filter(f => 
      f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|m4a)$/i)
    );
    if (!files.length) return;
    
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    playlist = files.map(f => {
      const url = URL.createObjectURL(f);
      const meta = parseFilename(f.name);
      return { src: url, filename: f.name, ...meta };
    });
    
    index = 0;
    loadIndex(index);
    play();
    renderPlaylistUI();
    updateUI();
  });

  chooseFilesBtn.addEventListener('click', () => fileInput.click());

  // Load manifest button
  loadManifestBtn.addEventListener('click', async () => {
    const ok = await tryLoadManifest();
    if (!ok) {
      alert('Could not load audio/playlist.json. Use "Load Local Audio Files" instead.');
    } else {
      play();
    }
  });

  // Start button - tries manifest first, then prompts user
  startBtn.addEventListener('click', async () => {
    audio.volume = Number(volumeSlider.value || 70) / 100;

    // Try to load manifest automatically
    const manifestLoaded = await tryLoadManifest();
    
    if (manifestLoaded && playlist.length > 0) {
      // Auto-play from manifest
      index = 0;
      loadIndex(index);
      try { 
        await audio.play(); 
        isPlaying = true; 
      } catch(e) { 
        console.warn('Autoplay blocked', e); 
      }
      updateUI();
      startOverlay.style.display = 'none';
    } else {
      // No manifest - tell user to load files
      startOverlay.style.display = 'none';
      alert('No audio files loaded. Click "Load Local Audio Files" to select your Bible audio folder.');
    }
  });

  // Global API
  window.BibleAudioPlayer = {
    setPlaylist: (arr) => {
      if (!arr || !arr.length) return;
      if (typeof arr[0] === 'string') {
        playlist = arr.map(p => {
          const filename = p.split('/').pop();
          const meta = parseFilename(filename);
          return { src: p, filename, ...meta };
        });
      } else {
        const files = arr;
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        playlist = files.map(f => {
          return { src: URL.createObjectURL(f), filename: f.name, ...parseFilename(f.name) };
        });
      }
      index = 0;
      loadIndex(index);
      renderPlaylistUI();
      updateUI();
    }
  };

  // Initial UI
  updateUI();
})();