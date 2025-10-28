(() => {
  /* -------------------------
     Element refs & state
     ------------------------- */
  const audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';

  const container = document.getElementById('container');
  const collapseBtn = document.getElementById('collapseBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const nowPlayingEl = document.getElementById('nowPlaying');
  const bookChapterEl = document.getElementById('bookChapter');
  const volumeSlider = document.getElementById('volume');
  const playlistEl = document.getElementById('playlist');
  const startBtn = document.getElementById('startBtn');
  const lyricsScroll = document.getElementById('lyricsScroll');
  const gif = document.getElementById('gifVisualizer');

  // UI extras we will create
  let progressBar, progressFill, timeCurrentEl, timeTotalEl, chapterSelect;

  let playlist = [];
  let index = 0;
  let isPlaying = false;
  let audioContext, src, analyser, dataArray, bufferLength, smoothLevel = 0;

  // For lyrics sync fallback
  let lyricLines = [];
  let lineTimes = []; // approximate start times per line (if no timestamps)
  let textKeyForCurrent = '';

  /* -------------------------
     UTIL: Parse filename -> meta
     - handles your naming patterns like:
         A01___01_Genesis_____ENGESVO2DA.mp3
         A19__001_Psalms______...
         B01___01_Matthew_____ENGESVN2DA.mp3
     Returns { src, filename, book, chapter (number), title, textKey, tokens }
     ------------------------- */
  function parseFilename(filename) {
    const base = filename.split('/').pop().replace(/\.[^/.]+$/, '');
    // split by one or more underscores, remove empties
    const tokens = base.split(/_+/).filter(Boolean);
    // tokens typically: ["A01", "01"|"001", "Genesis", "ENGESVO2DA"]
    const token0 = tokens[0] || '';
    const token1 = tokens[1] || '';
    const token2 = tokens[2] || '';

    // chapter number (convert to integer for display)
    const chapterNum = token1 ? parseInt(token1, 10) : NaN;

    // book name raw (sometimes like "1Samuel" or "SongofSongs")
    let bookRaw = token2 || 'Unknown';
    // if bookRaw is cameljoined like "SongofSongs", add spaces before capital letters except first
    bookRaw = bookRaw.replace(/([a-z])([A-Z])/g, '$1 $2');

    // If a numeric prefix (e.g. "1Samuel"), ensure it becomes "1 Samuel"
    bookRaw = bookRaw.replace(/^(\d)([A-Za-z])/, '$1 $2');

    // Capitalize first letter and keep rest as-is (most filenames already capitalized)
    const book = bookRaw.charAt(0).toUpperCase() + bookRaw.slice(1);

    const title = `${book} Chapter ${isNaN(chapterNum) ? token1 : chapterNum}`;

    // text file mapping uses first two tokens (eg "A01_01")
    const textKey = token0 && token1 ? `${token0}_${token1}` : `${base}`;

    return {
      filename: filename,
      src: `audio/${filename}`,
      book,
      chapter: isNaN(chapterNum) ? token1 : chapterNum,
      title,
      textKey,
      tokens
    };
  }

  /* -------------------------
     Web Audio visualizer setup (created on first user play)
     ------------------------- */
  function ensureAudioContext() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    try {
      src = audioContext.createMediaElementSource(audio);
    } catch (e) {
      // some browsers disallow if cross-origin or reused element; ignore if fails
      console.warn('createMediaElementSource failed:', e);
    }
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    if (src) {
      src.connect(analyser);
      analyser.connect(audioContext.destination);
    } else {
      // fallback: connect audio element directly to destination if we can't create source
      // (visualizer will still try using analyser but it won't be connected)
      try { analyser.connect(audioContext.destination); } catch {}
    }
    smoothLevel = 0;
    animatePulse();
  }

  function animatePulse() {
    if (!analyser || !dataArray) {
      requestAnimationFrame(animatePulse);
      return;
    }
    analyser.getByteFrequencyData(dataArray);
    // average
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    smoothLevel = smoothLevel * 0.82 + avg * 0.18;
    const scale = 1 + (smoothLevel / 256) * 0.5; // subtle
    gif.style.transform = `scale(${scale})`;
    gif.style.opacity = Math.min(1, 0.6 + smoothLevel / 400);
    requestAnimationFrame(animatePulse);
  }

  /* -------------------------
     MANIFEST (playlist.json) load
     ------------------------- */
  async function loadManifest() {
    try {
      const res = await fetch('audio/playlist.json', { cache: 'no-store' });
      const list = await res.json();

      playlist = list.map(fn => parseFilename(fn));
      if (!playlist.length) throw new Error('empty playlist');

      // populate playlist DOM & selector
      renderPlaylistUI();
      // set initial index to saved if exists, otherwise 0
      const saved = loadSavedState();
      index = (saved && typeof saved.index === 'number') ? saved.index : 0;
      loadTrack(index, /*restoreTime*/ saved?.currentTime || 0);
    } catch (err) {
      console.error(err);
      alert('No playlist.json found in /audio/ or it could not be loaded.');
    }
  }

  /* -------------------------
     Build small UI pieces (progress bar, time labels, chapter select)
     ------------------------- */
  function ensureExtraUI() {
    if (progressBar) return;
    // small container inner (we append below existing .container-inner)
    const inner = document.querySelector('.container-inner');
    // Progress bar wrapper
    const pbWrap = document.createElement('div');
    pbWrap.style.width = '90%';
    pbWrap.style.margin = '8px 0';
    pbWrap.style.display = 'flex';
    pbWrap.style.flexDirection = 'column';
    pbWrap.style.alignItems = 'center';
    pbWrap.style.gap = '6px';
    // progress bar
    progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '8px';
    progressBar.style.background = 'rgba(255,255,255,0.12)';
    progressBar.style.borderRadius = '10px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.cursor = 'pointer';
    progressFill = document.createElement('div');
    progressFill.style.height = '100%';
    progressFill.style.width = '0%';
    progressFill.style.background = 'linear-gradient(90deg, rgba(181,126,222,1), rgba(246,237,241,0.6))';
    progressFill.style.transition = 'width 0.1s linear';
    progressBar.appendChild(progressFill);
    // time labels
    const timeRow = document.createElement('div');
    timeRow.style.width = '100%';
    timeRow.style.display = 'flex';
    timeRow.style.justifyContent = 'space-between';
    timeRow.style.fontSize = '11px';
    timeRow.style.color = '#ccc';
    timeCurrentEl = document.createElement('span');
    timeCurrentEl.textContent = '0:00';
    timeTotalEl = document.createElement('span');
    timeTotalEl.textContent = '0:00';
    timeRow.appendChild(timeCurrentEl);
    timeRow.appendChild(timeTotalEl);

    // chapter select dropdown
    const chapterRow = document.createElement('div');
    chapterRow.style.width = '90%';
    chapterRow.style.display = 'flex';
    chapterRow.style.justifyContent = 'center';
    chapterRow.style.marginTop = '6px';
    chapterSelect = document.createElement('select');
    chapterSelect.id = 'chapterSelect';
    chapterSelect.style.width = '100%';
    chapterSelect.style.padding = '6px 8px';
    chapterSelect.style.borderRadius = '6px';
    chapterSelect.style.border = '1px solid rgba(255,255,255,0.12)';
    chapterSelect.style.background = 'rgba(0,0,0,0.4)';
    chapterSelect.style.color = '#fff';
    chapterSelect.style.fontSize = '12px';
    chapterRow.appendChild(chapterSelect);

    pbWrap.appendChild(progressBar);
    pbWrap.appendChild(timeRow);

    inner.appendChild(pbWrap);
    inner.appendChild(chapterRow);

    // events for progress seek
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = pct * (audio.duration || 0);
      // update immediately
      updateProgressUI();
      saveProgress();
    });

    chapterSelect.addEventListener('change', (e) => {
      const chosen = parseInt(e.target.value, 10);
      if (!isNaN(chosen)) {
        index = chosen;
        loadTrack(index);
        play();
      }
    });
  }

  /* -------------------------
     Render playlist DOM + chapter select options
     ------------------------- */
  function renderPlaylistUI() {
    ensureExtraUI();
    // build chapter select
    chapterSelect.innerHTML = playlist.map((t, i) => {
      // show "Genesis — Chapter 1"
      const display = `${t.book} — Chapter ${t.chapter}`;
      return `<option value="${i}" ${i === index ? 'selected' : ''}>${display}</option>`;
    }).join('');

    // build clickable playlist list (small)
    playlistEl.innerHTML = playlist.map((t, i) => {
      return `<div class="playlist-item" data-idx="${i}" style="padding:6px;cursor:pointer;color:rgba(255,255,255,0.9);border-bottom:1px solid rgba(255,255,255,0.03)">${t.title}</div>`;
    }).join('');

    // attach click handlers
    playlistEl.querySelectorAll('.playlist-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const i = parseInt(el.dataset.idx, 10);
        if (!isNaN(i)) {
          index = i;
          loadTrack(index);
          play();
        }
      });
    });
  }

  /* -------------------------
     Load a track by index
     - attempts to restore position (if restoreTime provided)
     ------------------------- */
  function loadTrack(i, restoreTime = 0) {
    const track = playlist[i];
    if (!track) return;
    // update UI
    nowPlayingEl.textContent = `Now Playing: ${track.book} — Chapter ${track.chapter}`;
    bookChapterEl.textContent = `${track.book} ${track.chapter}`;

    // set src and reset lyric state
    textKeyForCurrent = track.textKey;
    lyricLines = [];
    lineTimes = [];
    lyricsScroll.innerHTML = '<p style="opacity:0.4;">Loading text...</p>';

    // set audio src
    audio.src = track.src;

    // set the chapter dropdown selection
    if (chapterSelect) chapterSelect.value = String(i);

    // when metadata loads we can set restoreTime and duration etc
    audio.addEventListener('loadedmetadata', function _meta() {
      audio.removeEventListener('loadedmetadata', _meta);
      // restore time gently (if valid)
      if (restoreTime && audio.duration && restoreTime < audio.duration - 1) {
        audio.currentTime = restoreTime;
      }
      // update UI times
      timeTotalEl.textContent = formatTime(audio.duration || 0);
      updateProgressUI();
      // load lyrics (text file in audio_text folder): we expect a text file named like "A01_01.txt"
      loadLyricsForTrack(track);
    });

    // update playlist highlighting
    Array.from(playlistEl.querySelectorAll('.playlist-item')).forEach(el => {
      el.style.background = el.dataset.idx == i ? 'rgba(246,237,241,0.06)' : 'transparent';
    });
  }

  /* -------------------------
     Play / Pause / Next / Prev / Auto-next
     ------------------------- */
  function play() {
    ensureAudioContext();
    // browsers require resume on user interaction
    if (audioContext && audioContext.state === 'suspended') audioContext.resume().catch(()=>{});
    audio.play().catch(err => console.warn('Play failed:', err));
    isPlaying = true;
    playPauseBtn.textContent = '⏸ Pause';
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = '▶ Play';
  }

  playPauseBtn.addEventListener('click', () => (isPlaying ? pause() : play()));

  nextBtn.addEventListener('click', () => {
    goNext();
  });

  prevBtn.addEventListener('click', () => {
    goPrev();
  });

  function goNext() {
    index = (index + 1) % playlist.length;
    loadTrack(index);
    play();
    saveProgress();
  }

  function goPrev() {
    index = (index - 1 + playlist.length) % playlist.length;
    loadTrack(index);
    play();
    saveProgress();
  }

  // auto-next when ended
  audio.addEventListener('ended', () => {
    goNext();
  });

  /* -------------------------
     Volume control & saving
     ------------------------- */
  volumeSlider.addEventListener('input', e => {
    audio.volume = e.target.value / 100;
    saveSettings();
  });

  /* -------------------------
     Progress UI updates (timeupdate)
     ------------------------- */
  function updateProgressUI() {
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    const pct = dur ? (cur / dur) * 100 : 0;
    if (progressFill) progressFill.style.width = `${pct}%`;
    timeCurrentEl.textContent = formatTime(cur);
    timeTotalEl.textContent = formatTime(dur);
  }

  audio.addEventListener('timeupdate', () => {
    updateProgressUI();
    // update lyrics highlighting
    syncLyricsByTime();
    // save progress periodically while playing
    if (isPlaying) throttledSaveProgress();
  });

  /* -------------------------
     Save / Load progress & settings (localStorage)
     ------------------------- */
  const SAVE_KEY = 'biblePlayerState_v1';
  const SETTINGS_KEY = 'biblePlayerSettings_v1';
  function saveProgress() {
    try {
      const obj = { index, currentTime: audio.currentTime || 0 };
      localStorage.setItem(SAVE_KEY, JSON.stringify(obj));
    } catch {}
  }
  // throttle saves to once per ~2 seconds while playing
  let lastSave = 0;
  function throttledSaveProgress() {
    const now = Date.now();
    if (now - lastSave > 1800) {
      saveProgress();
      lastSave = now;
    }
  }
  // also save on unload
  window.addEventListener('beforeunload', () => {
    saveProgress();
    saveSettings();
  });

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj;
    } catch { return null; }
  }

  // Settings: volume and maybe preferred behavior
  function saveSettings() {
    try {
      const settings = { volume: audio.volume || (volumeSlider.value/100) || 0.7 };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.volume !== undefined) {
        audio.volume = s.volume;
        volumeSlider.value = Math.round(s.volume * 100);
      }
    } catch {}
  }

  /* -------------------------
     Lyrics loading & sync
     - expects text files in audio_text/ named by the `textKey` (eg: A01_01.txt)
     - If lines have timestamps like [00:15] we parse them; otherwise we evenly assign times based on track duration
     ------------------------- */
  async function loadLyricsForTrack(track) {
    const key = track.textKey;
    const txtPathCandidates = [
      `audio_text/${key}.txt`,
      `audio_text/${track.filename.replace(/\.[^/.]+$/, '')}.txt`,
      `audio_text/${track.book}_${track.chapter}.txt`, // fallback
    ];
    let text = null;
    for (const p of txtPathCandidates) {
      try {
        const r = await fetch(p, { cache: 'no-store' });
        if (!r.ok) continue;
        text = await r.text();
        break;
      } catch {}
    }
    if (!text) {
      lyricsScroll.innerHTML = '<p style="opacity:0.4;">No text for this chapter.</p>';
      lyricLines = [];
      lineTimes = [];
      return;
    }

    // parse lines and optional [mm:ss] timestamps
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lyricLines = rawLines.map((l, i) => {
      // detect [mm:ss.xx] or [mm:ss] timestamp at start
      const m = l.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
      if (m) {
        const mm = parseInt(m[1], 10);
        const ss = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3,'0'), 10) : 0;
        const t = mm * 60 + ss + (ms / 1000);
        return { text: m[4] || '', time: t };
      } else {
        return { text: l, time: null };
      }
    });

    // If some lines have times, use them; otherwise create equally spaced times after metadata available
    const anyTimestamps = lyricLines.some(l => l.time !== null);
    if (anyTimestamps) {
      lineTimes = lyricLines.map(l => l.time || 0);
      // populate DOM with lines, attaching data-time
      lyricsScroll.innerHTML = lyricLines.map(l => `<div class="lyrics-line" data-time="${l.time ?? ''}">${escapeHtml(l.text)}</div>`).join('');
    } else {
      // evenly split across duration (can't compute until metadata available)
      lyricsScroll.innerHTML = lyricLines.map(l => `<div class="lyrics-line">${escapeHtml(l.text)}</div>`).join('');
      // if we have duration, compute lineTimes now
      if (audio.duration && audio.duration > 0) {
        const dur = audio.duration;
        const step = dur / Math.max(1, lyricLines.length);
        lineTimes = lyricLines.map((_,i) => i * step);
      } else {
        // wait for metadata event to compute
        audio.addEventListener('loadedmetadata', function _tm() {
          audio.removeEventListener('loadedmetadata', _tm);
          const dur = audio.duration || 0;
          const step = dur / Math.max(1, lyricLines.length);
          lineTimes = lyricLines.map((_,i) => i * step);
        });
      }
    }
  }

  function syncLyricsByTime() {
    if (!lineTimes || !lineTimes.length) return;
    const t = audio.currentTime || 0;
    // find last index where lineTimes[i] <= t
    let idx = 0;
    // improved search: simple linear from last known might be OK; for simplicity do binary-ish
    for (let i = 0; i < lineTimes.length; i++) {
      if (t >= lineTimes[i]) idx = i;
      else break;
    }
    // apply active class
    const nodes = Array.from(lyricsScroll.querySelectorAll('.lyrics-line'));
    nodes.forEach((n, i) => {
      if (i === idx) {
        if (!n.classList.contains('active')) {
          n.classList.add('active');
          // scroll active into center of lyrics container smoothly
          n.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        n.classList.remove('active');
      }
    });
  }

  /* -------------------------
     Helpers
     ------------------------- */
  function formatTime(s) {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  /* -------------------------
     Start button (overlay)
     ------------------------- */
  startBtn.addEventListener('click', async () => {
    document.getElementById('startOverlay').style.display = 'none';
    ensureAudioContext();
    await loadManifest();
    loadSettings(); // apply saved settings (volume)
    // attempt to restore time (loadManifest called loadTrack which attempted restore)
    play();
  });

  /* -------------------------
     Dragging the capsule
     (respects clicking controls by checking target tagName)
     ------------------------- */
  (function makeDraggable() {
    let isDragging = false;
    let offsetX = 0, offsetY = 0;
    container.style.touchAction = 'none'; // prevent browser touch gestures

    container.addEventListener('mousedown', (e) => {
      // ignore clicks on controls so you can interact without dragging
      const ignoreTags = ['BUTTON', 'INPUT', 'SELECT', 'LABEL'];
      if (ignoreTags.includes(e.target.tagName)) return;
      isDragging = true;
      container.style.transition = 'none';
      const rect = container.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      // set left/top in px but keep translate(-50%,-50%) removed to prevent centering conflict
      // we change approach: when user drags, set transform to none and position via left/top
      container.style.transform = 'none';
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      container.style.transition = 'all 0.3s ease';
      container.style.cursor = 'grab';
    });

    // touch support
    container.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      const rect = container.getBoundingClientRect();
      offsetX = t.clientX - rect.left;
      offsetY = t.clientY - rect.top;
      isDragging = true;
      container.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const t = e.touches[0];
      const x = t.clientX - offsetX;
      const y = t.clientY - offsetY;
      container.style.transform = 'none';
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      isDragging = false;
      container.style.transition = 'all 0.3s ease';
    });
  })();

  /* -------------------------
     Collapse behavior (toggle)
     ------------------------- */
  collapseBtn.addEventListener('click', () => container.classList.toggle('collapsed'));
  container.addEventListener('dblclick', () => container.classList.toggle('collapsed'));

  /* -------------------------
     On audio metadata change => update total time
     and progress UI
     ------------------------- */
  audio.addEventListener('loadedmetadata', () => {
    timeTotalEl && (timeTotalEl.textContent = formatTime(audio.duration || 0));
    // if lyric lines were loaded but no times, compute even spacing now
    if (lyricLines && lyricLines.length && (!lineTimes || !lineTimes.length)) {
      const dur = audio.duration || 0;
      const step = dur / Math.max(1, lyricLines.length);
      lineTimes = lyricLines.map((_, i) => i * step);
    }
  });

  /* -------------------------
     Format final initialization:
     create UI extras and restore settings if possible
     ------------------------- */
  (function init() {
    ensureExtraUI();
    // load saved settings here (volume) — playlist loaded later will set index/time
    loadSettings();

    // set default volume if nothing saved
    if (isNaN(audio.volume) || audio.volume === 0) {
      audio.volume = (volumeSlider.value / 100) || 0.7;
    }

    // keyboard shortcuts (space toggle)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        (isPlaying ? pause() : play());
      }
      if (e.code === 'ArrowRight') { goNext(); }
      if (e.code === 'ArrowLeft') { goPrev(); }
    });

    // populate a quick placeholder playlist UI if manifest not yet loaded
    playlistEl.innerHTML = `<div style="opacity:0.6;padding:8px;">Playlist loading…</div>`;
  })();

  /* -------------------------
     Utility: format guard for audio.duration update cases
     ------------------------- */
  // small safety to ensure UI updates frequently enough
  setInterval(() => {
    if (!audio.paused) updateProgressUI();
  }, 800);

})();
