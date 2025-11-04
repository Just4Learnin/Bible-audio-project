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
  const bookSelect = document.getElementById('bookSelect');
  const chapterSelect = document.getElementById('chapterSelect');

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
  const bookMap = {
    'A01': 'Genesis',
    'A02': 'Exodus',
    'A03': 'Leviticus',
    'A04': 'Numbers',
    'A05': 'Deuteronomy',
    // Add more books as needed
  };

  function populateBookSelect() {
    const books = [...new Set(playlist.map(track => track.book))];
    bookSelect.innerHTML = books.map(bookCode => {
      const bookName = bookMap[bookCode] || bookCode;
      return `<option value="${bookCode}">${bookName}</option>`;
    }).join('');
    bookSelect.value = playlist[index].book;
  }

  function populateChapterSelect(bookCode) {
    const chapters = playlist.filter(track => track.book === bookCode).map(track => track.chapter);
    chapterSelect.innerHTML = chapters.map(chapter => `<option value="${chapter}">${chapter}</option>`).join('');
    chapterSelect.value = playlist[index].chapter;
  }

  function parseFilename(filename) {
    const base = filename.split('/').pop().replace(/\.[^/.]+$/, "");
    const tokens = base.split(/[_\- ]+/);
    const bookCode = tokens[0] || base;
    const chapter = tokens[1] || '';
    const bookName = bookMap[bookCode] || bookCode;
    return { book: bookCode, chapter: chapter, title: `${bookName} Chapter ${chapter}` };
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
      populateBookSelect();
      populateChapterSelect(playlist[index].book);
    } catch {
      alert('No playlist.json found in /audio/');
    }
  }

  function loadTrack(i) {
    const track = playlist[i];
    if (!track) return;
    audio.src = track.src;
    nowPlayingEl.textContent = `Now Playing: ${track.title}`;
    bookChapterEl.textContent = track.title;
    loadLyrics(track.book, track.chapter);
    bookSelect.value = track.book;
    populateChapterSelect(track.book);
    chapterSelect.value = track.chapter;
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

  bookSelect.addEventListener('change', (e) => {
    const selectedBookCode = e.target.value;
    populateChapterSelect(selectedBookCode);
    // Load the first chapter of the selected book
    const firstChapterTrack = playlist.find(track => track.book === selectedBookCode && track.chapter === chapterSelect.options[0].value);
    if (firstChapterTrack) {
      index = playlist.indexOf(firstChapterTrack);
      loadTrack(index);
      play();
    }
  });

  chapterSelect.addEventListener('change', (e) => {
    const selectedBookCode = bookSelect.value;
    const selectedChapter = e.target.value;
    const selectedTrack = playlist.find(track => track.book === selectedBookCode && track.chapter === selectedChapter);
    if (selectedTrack) {
      index = playlist.indexOf(selectedTrack);
      loadTrack(index);
      play();
    }
  });
  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    (isPlaying ? pause() : play());
  });
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
  let lyricLines = [];
  async function loadLyrics(book, chapter) {
    const path = `./audio_text/${book}_${chapter}.txt`;
    try {
      const res = await fetch(path);
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      lyricsScroll.innerHTML = lines.map(l => `<div class="lyrics-line">${l}</div>`).join('');
      lyricLines = Array.from(lyricsScroll.children);
    } catch {
      lyricsScroll.innerHTML = '<p style="opacity:0.4;">No text for this chapter.</p>';
      lyricLines = [];
    }
  }

  function updateLyrics() {
    if (!audio.duration || lyricLines.length === 0 || !isFinite(audio.duration)) return;

    const progress = audio.currentTime / audio.duration;
    const lineIndex = Math.floor(progress * lyricLines.length);

    lyricLines.forEach((line, i) => {
      if (i === lineIndex) {
        line.classList.add('active');
        // Scroll the active line into view
        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        line.classList.remove('active');
      }
    });
  }

  audio.addEventListener('timeupdate', updateLyrics);
})();

  // 🖱️ Make the player draggable
  let isDragging = false;
  let startX, startY, initialMouseX, initialMouseY;

  container.addEventListener('mousedown', (e) => {
    // Prevent dragging if user clicks a button, slider, or input
    if (['BUTTON', 'INPUT', 'LABEL', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;

    isDragging = false; // Assume it's a click initially
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;
    const rect = container.getBoundingClientRect();
    startX = rect.left;
    startY = rect.top;
    container.style.transition = 'none';
    container.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (e.buttons === 0) { // If mouse button is released outside the container
      isDragging = false;
      container.style.transition = 'all 0.4s ease';
      container.style.cursor = 'grab';
      return;
    }

    if (initialMouseX === undefined) return; // No mousedown event recorded

    const dx = e.clientX - initialMouseX;
    const dy = e.clientY - initialMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5 || isDragging) { // Start dragging if moved beyond threshold or already dragging
      isDragging = true;
      const newX = startX + dx;
      const newY = startY + dy;

      container.style.left = `${newX + container.offsetWidth / 2}px`;
      container.style.top = `${newY + container.offsetHeight / 2}px`;
      container.style.transform = `translate(-50%, -50%)`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    initialMouseX = undefined; // Reset initial mouse position
    initialMouseY = undefined;
    container.style.transition = 'all 0.4s ease';
    container.style.cursor = 'grab';
  });
