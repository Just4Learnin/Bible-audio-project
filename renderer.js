(() => {
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

  let playlist = [];
  let index = 0;
  let isPlaying = false;

  // 🎵 Web Audio Visualizer
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  src.connect(analyser);
  analyser.connect(ctx.destination);

  let smoothLevel = 0; // smoothed amplitude
  function animatePulse() {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    // Smooth with exponential filter
    smoothLevel = smoothLevel * 0.8 + avg * 0.2;
    const scale = 1 + (smoothLevel / 256) * 0.5; // subtle pulse
    gif.style.transform = `scale(${scale})`;
    gif.style.opacity = Math.min(1, 0.6 + smoothLevel / 400);
    requestAnimationFrame(animatePulse);
  }
  animatePulse();

  // 🎧 Parse file metadata
  function parseFilename(filename) {
    const base = filename.split('/').pop().replace(/\.[^/.]+$/, "");
    const tokens = base.split(/[_\- ]+/);
    return { book: tokens[0] || base, chapter: tokens[1] || '', title: `${tokens[0] || base} ${tokens[1] || ''}` };
  }

  // 🗂 Load playlist.json
  async function loadManifest() {
    try {
      const res = await fetch('audio/playlist.json', { cache: 'no-store' });
      const list = await res.json();
      playlist = list.map(fn => {
        const meta = parseFilename(fn);
        return { src: `audio/${fn}`, filename: fn, ...meta };
      });
      index = 0;
      loadTrack(index);
    } catch {
      alert('No playlist.json found in /audio/');
    }
  }

  function loadTrack(i) {
    const track = playlist[i];
    if (!track) return;
    audio.src = track.src;
    nowPlayingEl.textContent = `Now Playing: ${track.title}`;
    bookChapterEl.textContent = `${track.book} ${track.chapter}`;
    loadLyrics(track.book, track.chapter);
  }

  function play() {
    ctx.resume();
    audio.play();
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
    index = (index + 1) % playlist.length;
    loadTrack(index);
    play();
  });
  prevBtn.addEventListener('click', () => {
    index = (index - 1 + playlist.length) % playlist.length;
    loadTrack(index);
    play();
  });

  volumeSlider.addEventListener('input', e => (audio.volume = e.target.value / 100));

  startBtn.addEventListener('click', async () => {
    document.getElementById('startOverlay').style.display = 'none';
    await loadManifest();
    play();
  });

  // 🌀 Collapse
  collapseBtn.addEventListener('click', () => container.classList.toggle('collapsed'));
  container.addEventListener('dblclick', () => container.classList.toggle('collapsed'));

  // 📜 Load Bible text
  async function loadLyrics(book, chapter) {
    const path = `./audio_text/${book}_${chapter}.txt`;
    try {
      const res = await fetch(path);
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      lyricsScroll.innerHTML = lines.map(l => `<div class="lyrics-line">${l}</div>`).join('');
    } catch {
      lyricsScroll.innerHTML = '<p style="opacity:0.4;">No text for this chapter.</p>';
    }
  }
})();

  // 🖱️ Make the player draggable
  let isDragging = false;
  let offsetX, offsetY;

  container.addEventListener('mousedown', (e) => {
    // Prevent dragging if user clicks a button, slider, or input
    if (['BUTTON', 'INPUT', 'LABEL'].includes(e.target.tagName)) return;

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
    container.style.left = `${x + container.offsetWidth / 2}px`;
    container.style.top = `${y + container.offsetHeight / 2}px`;
    container.style.transform = `translate(-50%, -50%)`; // keep center-based layout
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.transition = 'all 0.4s ease';
    container.style.cursor = 'grab';
  });

