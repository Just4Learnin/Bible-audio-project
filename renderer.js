(() => {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';

  const lyricsScroll = document.getElementById('lyricsScroll');
  const container = document.getElementById('container');
  const collapseBtn = document.getElementById('collapseBtn');
  const nowPlaying = document.getElementById('nowPlaying');
  const bookChapter = document.getElementById('bookChapter');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const loopToggle = document.getElementById('loopToggle');
  const chooseFilesBtn = document.getElementById('chooseFilesBtn');
  const fileInput = document.getElementById('fileInput');
  const loadManifestBtn = document.getElementById('loadManifestBtn');
  const volumeSlider = document.getElementById('volume');
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const playlistEl = document.getElementById('playlist');
  const toggleBtn = document.getElementById('toggleControls');
  const controlsSection = document.getElementById('controlsSection');

  let playlist = [];
  let index = 0;
  let isPlaying = false;
  let loopEnabled = true;
  let verses = [];
  let currentVerseIndex = 0;
  let isCollapsed = false;

  // 🎯 Make player draggable
  let dragging = false, offsetX = 0, offsetY = 0;
  container.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    offsetX = e.clientX - container.offsetLeft;
    offsetY = e.clientY - container.offsetTop;
    container.style.transition = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    container.style.left = `${e.clientX - offsetX}px`;
    container.style.top = `${e.clientY - offsetY}px`;
  });
  document.addEventListener('mouseup', () => dragging = false);

  // Collapse toggle
  collapseBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    container.classList.toggle('collapsed', isCollapsed);
  });

  function parseFilename(name) {
    const base = name.replace(/\.[^/.]+$/, '');
    const parts = base.split(/[_\- ]+/);
    return { book: parts[0] || 'Book', chapter: parts[1] || '1', title: `${parts[0]} ${parts[1]}` };
  }

  function updateUI() {
    if (!playlist.length) return;
    const track = playlist[index];
    nowPlaying.textContent = `Now Playing: ${track.title}`;
    bookChapter.textContent = `${track.book} ${track.chapter}`;
    playPauseBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    loopToggle.textContent = `Loop: ${loopEnabled ? 'On' : 'Off'}`;
  }

  async function loadBibleText(book, chapter) {
    const path = `./audio_text/${book}_${chapter}.txt`;
    try {
      const res = await fetch(path);
      const text = await res.text();
      verses = text.split('\n').filter(v => v.trim());
      lyricsScroll.innerHTML = verses.map(v => `<div class="lyrics-line">${v}</div>`).join('');
    } catch {
      verses = [];
      lyricsScroll.innerHTML = '<div style="opacity:0.4;">No text found</div>';
    }
  }

  function syncLyrics() {
    if (!verses.length || !audio.duration) return;
    const lines = lyricsScroll.querySelectorAll('.lyrics-line');
    const t = audio.currentTime / audio.duration;
    const idx = Math.floor(t * lines.length);
    if (idx !== currentVerseIndex) {
      lines.forEach((l, i) => l.classList.toggle('active', i === idx));
      const active = lines[idx];
      if (active) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      currentVerseIndex = idx;
    }
  }

  function loadTrack(i) {
    const t = playlist[i];
    audio.src = t.src;
    audio.load();
    loadBibleText(t.book, t.chapter);
    updateUI();
  }

  function play() { audio.play(); isPlaying = true; updateUI(); }
  function pause() { audio.pause(); isPlaying = false; updateUI(); }
  function next() { index = (index + 1) % playlist.length; loadTrack(index); play(); }
  function prev() { index = (index - 1 + playlist.length) % playlist.length; loadTrack(index); play(); }

  playPauseBtn.onclick = () => (isPlaying ? pause() : play());
  nextBtn.onclick = next;
  prevBtn.onclick = prev;
  loopToggle.onclick = () => { loopEnabled = !loopEnabled; updateUI(); };
  volumeSlider.oninput = e => audio.volume = e.target.value / 100;

  audio.addEventListener('timeupdate', syncLyrics);
  audio.addEventListener('ended', () => loopEnabled ? next() : pause());

  async function tryLoadManifest() {
    try {
      const res = await fetch('audio/playlist.json');
      const files = await res.json();
      playlist = files.map(f => ({ src: `audio/${f}`, ...parseFilename(f) }));
      loadTrack(0);
      return true;
    } catch { return false; }
  }

  fileInput.onchange = e => {
    const files = Array.from(e.target.files);
    playlist = files.map(f => ({ src: URL.createObjectURL(f), ...parseFilename(f.name) }));
    index = 0; loadTrack(0); play();
  };
  chooseFilesBtn.onclick = () => fileInput.click();

  startBtn.onclick = async () => {
    const ok = await tryLoadManifest();
    startOverlay.style.display = 'none';
    if (ok) play();
  };

  toggleBtn.onclick = () => {
    controlsSection.classList.toggle('collapsed');
    toggleBtn.textContent = controlsSection.classList.contains('collapsed') ? '📂 Menu' : '📁 Close';
  };

  updateUI();
})();
