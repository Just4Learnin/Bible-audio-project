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
  const bookSelect = document.getElementById('bookSelect');
  const chapterSelect = document.getElementById('chapterSelect');
  
  // Central control buttons
  const centralPlayPause = document.getElementById('centralPlayPause');
  const rewind15Btn = document.getElementById('rewind15');
  const forward15Btn = document.getElementById('forward15');

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

  // Simplified audio context for basic functionality
  function initAudio() {
    // Keep basic audio context for potential future use
    console.log('🎵 Audio context initialized');
  }
  initAudio();

  // 🎧 Parse file metadata
  const bookMap = {
    'A01': 'Genesis',
    'A02': 'Exodus',
    'A03': 'Leviticus',
    'A04': 'Numbers',
    'A05': 'Deuteronomy',
    'A06': 'Joshua',
    'A07': 'Judges',
    'A08': 'Ruth',
    'A09': '1_Samuel',     // Updated to match text file naming
    'A10': '2_Samuel',     // Updated to match text file naming
    'A11': '1_Kings',      // Updated to match text file naming
    'A12': '2_Kings',      // Updated to match text file naming
    'A13': '1_Chronicles', // Updated to match text file naming
    'A14': '2_Chronicles', // Updated to match text file naming
    'A15': 'Ezra',
    'A16': 'Nehemiah',
    'A17': 'Esther',
    'A18': 'Job',
    'A19': 'Psalms',
    'A20': 'Proverbs',
    'A21': 'Ecclesiastes',
    'A22': 'Song_of_Solomon', // Updated to match text file naming
    'A23': 'Isaiah',
    'A24': 'Jeremiah',
    'A25': 'Lamentations',
    'A26': 'Ezekiel',
    'A27': 'Daniel',
    'A28': 'Hosea',
    'A29': 'Joel',
    'A30': 'Amos',
    'A31': 'Obadiah',
    'A32': 'Jonah',
    'A33': 'Micah',
    'A34': 'Nahum',
    'A35': 'Habakkuk',
    'A36': 'Zephaniah',
    'A37': 'Haggai',
    'A38': 'Zechariah',
    'A39': 'Malachi',
    'B01': 'Matthew',
    'B02': 'Mark',
    'B03': 'Luke',
    'B04': 'John',
    'B05': 'Acts',
    'B06': 'Romans',
    'B07': '1_Corinthians',    // Updated to match text file naming
    'B08': '2_Corinthians',    // Updated to match text file naming
    'B09': 'Galatians',
    'B10': 'Ephesians',
    'B11': 'Philippians',
    'B12': 'Colossians',
    'B13': '1_Thessalonians',  // Updated to match text file naming
    'B14': '2_Thessalonians',  // Updated to match text file naming
    'B15': '1_Timothy',        // Updated to match text file naming
    'B16': '2_Timothy',        // Updated to match text file naming
    'B17': 'Titus',
    'B18': 'Philemon',
    'B19': 'Hebrews',
    'B20': 'James',
    'B21': '1_Peter',          // Updated to match text file naming
    'B22': '2_Peter',          // Updated to match text file naming
    'B23': '1_John',           // Updated to match text file naming
    'B24': '2_John',           // Updated to match text file naming
    'B25': '3_John',           // Updated to match text file naming
    'B26': 'Jude',
    'B27': 'Revelation'
  };
  
  // Display names for the UI (human-readable)
  const bookDisplayNames = {
    'A01': 'Genesis',
    'A02': 'Exodus',
    'A03': 'Leviticus',
    'A04': 'Numbers',
    'A05': 'Deuteronomy',
    'A06': 'Joshua',
    'A07': 'Judges',
    'A08': 'Ruth',
    'A09': '1 Samuel',
    'A10': '2 Samuel',
    'A11': '1 Kings',
    'A12': '2 Kings',
    'A13': '1 Chronicles',
    'A14': '2 Chronicles',
    'A15': 'Ezra',
    'A16': 'Nehemiah',
    'A17': 'Esther',
    'A18': 'Job',
    'A19': 'Psalms',
    'A20': 'Proverbs',
    'A21': 'Ecclesiastes',
    'A22': 'Song of Solomon',
    'A23': 'Isaiah',
    'A24': 'Jeremiah',
    'A25': 'Lamentations',
    'A26': 'Ezekiel',
    'A27': 'Daniel',
    'A28': 'Hosea',
    'A29': 'Joel',
    'A30': 'Amos',
    'A31': 'Obadiah',
    'A32': 'Jonah',
    'A33': 'Micah',
    'A34': 'Nahum',
    'A35': 'Habakkuk',
    'A36': 'Zephaniah',
    'A37': 'Haggai',
    'A38': 'Zechariah',
    'A39': 'Malachi',
    'B01': 'Matthew',
    'B02': 'Mark',
    'B03': 'Luke',
    'B04': 'John',
    'B05': 'Acts',
    'B06': 'Romans',
    'B07': '1 Corinthians',
    'B08': '2 Corinthians',
    'B09': 'Galatians',
    'B10': 'Ephesians',
    'B11': 'Philippians',
    'B12': 'Colossians',
    'B13': '1 Thessalonians',
    'B14': '2 Thessalonians',
    'B15': '1 Timothy',
    'B16': '2 Timothy',
    'B17': 'Titus',
    'B18': 'Philemon',
    'B19': 'Hebrews',
    'B20': 'James',
    'B21': '1 Peter',
    'B22': '2 Peter',
    'B23': '1 John',
    'B24': '2 John',
    'B25': '3 John',
    'B26': 'Jude',
    'B27': 'Revelation'
  };

  function populateBookSelect() {
    const books = [...new Set(playlist.map(track => track.book))];
    bookSelect.innerHTML = books.map(bookCode => {
      const bookName = bookDisplayNames[bookCode] || bookCode;
      return `<option value="${bookCode}">${bookName}</option>`;
    }).join('');
    bookSelect.value = playlist[index].book;
  }

  function populateChapterSelect(bookCode) {
    const chapters = [...new Set(playlist.filter(track => track.book === bookCode).map(track => track.chapter))];
    chapterSelect.innerHTML = chapters.map(chapter => `<option value="${chapter}">${chapter}</option>`).join('');
    chapterSelect.value = playlist[index].chapter;
  }

  function parseFilename(filename) {
    const base = filename.split('/').pop().replace(/\.[^/.]+$/, "");
    const tokens = base.split(/[_\- ]+/);
    const bookCode = tokens[0] || base;
    // Extract chapter number - handle format like "01" -> "1"
    let chapter = tokens[1] || '';
    if (chapter) {
      // Remove leading zeros and convert to number then back to string
      chapter = parseInt(chapter, 10).toString();
    }
    const displayName = bookDisplayNames[bookCode] || bookCode;
    return { book: bookCode, chapter: chapter, title: `${displayName} Chapter ${chapter}` };
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
    centralPlayPause.textContent = '⏸';
    centralPlayPause.title = 'Pause';
    updatePlayingState();
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = '▶ Play';
    centralPlayPause.textContent = '▶';
    centralPlayPause.title = 'Play';
    updatePlayingState();
  }
  
  function skipForward15() {
    if (audio.duration) {
      audio.currentTime = Math.min(audio.currentTime + 15, audio.duration);
      console.log(`⏩ Skipped forward 15s to ${audio.currentTime.toFixed(1)}s`);
    }
  }
  
  function skipBackward15() {
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
    console.log(`⏪ Rewound 15s to ${audio.currentTime.toFixed(1)}s`);
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
  
  // Central control event listeners
  centralPlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    (isPlaying ? pause() : play());
  });
  
  forward15Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipForward15();
  });
  
  rewind15Btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skipBackward15();
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

  // 🌀 Enhanced Collapse functionality
  function toggleCollapse() {
    container.classList.toggle('collapsed');
    updateCollapseButton();
    updatePlayingState();
  }

  function updateCollapseButton() {
    const isCollapsed = container.classList.contains('collapsed');
    collapseBtn.innerHTML = isCollapsed ? '▲' : '⌄';
    collapseBtn.title = isCollapsed ? 'Expand Player' : 'Collapse Player';
  }

  function updatePlayingState() {
    if (isPlaying) {
      container.classList.add('playing');
    } else {
      container.classList.remove('playing');
    }
  }

  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCollapse();
  });
  
  // Double click to toggle (desktop) or single tap when collapsed (mobile)
  container.addEventListener('dblclick', (e) => {
    if (!['BUTTON', 'INPUT', 'SELECT'].includes(e.target.tagName)) {
      toggleCollapse();
    }
  });

  // Mobile: single tap when collapsed to expand
  container.addEventListener('click', (e) => {
    if (container.classList.contains('collapsed') && 
        !['BUTTON', 'INPUT', 'SELECT'].includes(e.target.tagName)) {
      e.preventDefault();
      toggleCollapse();
    }
  });

  // 📜 Load Bible text - Enhanced synchronization
  let lyricLines = [];
  let verseTimings = [];
  let currentVerseIndex = 0;
  let syncMode = 'enhanced'; // 'basic' or 'enhanced' or 'adaptive'
  
  // Create a mapping function to handle text file naming variations
  function getTextFileName(bookCode, chapter) {
    const bookName = bookMap[bookCode];
    if (!bookName || !chapter) return null;
    
    // Pad chapter number to 2 digits for consistency
    const paddedChapter = chapter.padStart(2, '0');
    
    // List of possible filename patterns to try (most likely first)
    const patterns = [
      `${bookName}_${chapter}.txt`,        // Primary: 1_Samuel_1.txt, Genesis_1.txt
      `${bookName}_${paddedChapter}.txt`,  // Fallback: Genesis_01.txt  
    ];
    
    return patterns;
  }
  
  // Calculate verse reading time based on word count and complexity
  function calculateVerseReadingTime(verseText) {
    const words = verseText.split(/\s+/).length;
    const baseWordsPerSecond = 2.5; // Average reading speed
    
    // Adjust for punctuation and complexity
    const punctuationCount = (verseText.match(/[,.;:]/g) || []).length;
    const sentenceEnds = (verseText.match(/[.!?]/g) || []).length;
    
    // Base time calculation
    let readingTime = words / baseWordsPerSecond;
    
    // Add pauses for punctuation
    readingTime += punctuationCount * 0.2; // Short pause for commas/semicolons
    readingTime += sentenceEnds * 0.5; // Longer pause for sentence endings
    
    // Minimum time per verse
    return Math.max(readingTime, 2.0);
  }
  
  function generateVerseTimings(lines, totalDuration) {
    const timings = [];
    const totalEstimatedTime = lines.reduce((sum, line) => {
      return sum + calculateVerseReadingTime(line.textContent || line);
    }, 0);
    
    // Scale to fit actual audio duration
    const scaleFactor = totalDuration / totalEstimatedTime;
    
    let cumulativeTime = 0;
    for (let i = 0; i < lines.length; i++) {
      const verseText = lines[i].textContent || lines[i];
      const estimatedTime = calculateVerseReadingTime(verseText) * scaleFactor;
      
      timings.push({
        index: i,
        startTime: cumulativeTime,
        endTime: cumulativeTime + estimatedTime,
        duration: estimatedTime,
        text: verseText
      });
      
      cumulativeTime += estimatedTime;
    }
    
    return timings;
  }
  
  async function loadLyrics(bookCode, chapter) {
    const patterns = getTextFileName(bookCode, chapter);
    if (!patterns) {
      lyricsScroll.innerHTML = '<p style="opacity:0.4;">Invalid book or chapter.</p>';
      lyricLines = [];
      verseTimings = [];
      return;
    }
    
    // Try each pattern until one works
    for (const pattern of patterns) {
      try {
        const path = `./audio_text/${pattern}`;
        const res = await fetch(path);
        if (res.ok) {
          const text = await res.text();
          const lines = text.split('\n').filter(Boolean);
          
          // Enhanced markup for better synchronization
          lyricsScroll.innerHTML = lines.map((line, i) => 
            `<div class="lyrics-line" data-verse="${i}" data-words="${line.split(/\s+/).length}">${line}</div>`
          ).join('');
          
          lyricLines = Array.from(lyricsScroll.children);
          currentVerseIndex = 0;
          
          // Generate timing estimates when audio metadata is available
          if (audio.duration && audio.duration > 0) {
            verseTimings = generateVerseTimings(lines, audio.duration);
          }
          
          console.log(`✅ Loaded lyrics from: ${pattern} (${lines.length} verses)`);
          return;
        }
      } catch (error) {
        console.log(`❌ Failed to load: ${pattern}`);
        continue;
      }
    }
    
    // If we get here, none of the patterns worked
    console.warn(`⚠️ No text file found for ${bookDisplayNames[bookCode]} Chapter ${chapter}`);
    lyricsScroll.innerHTML = '<p style="opacity:0.4;">No text available for this chapter.</p>';
    lyricLines = [];
    verseTimings = [];
  }

  function updateLyrics() {
    if (!audio.duration || lyricLines.length === 0 || !isFinite(audio.duration)) return;

    const currentTime = audio.currentTime;
    let newVerseIndex = currentVerseIndex;
    
    // Enhanced synchronization modes
    if (syncMode === 'enhanced' && verseTimings.length > 0) {
      // Use intelligent timing based on word count and reading speed
      newVerseIndex = verseTimings.findIndex(timing => 
        currentTime >= timing.startTime && currentTime < timing.endTime
      );
      
      if (newVerseIndex === -1) {
        // Fallback to last verse if time exceeds calculated timings
        newVerseIndex = Math.min(
          Math.floor((currentTime / audio.duration) * verseTimings.length),
          verseTimings.length - 1
        );
      }
    } else if (syncMode === 'adaptive') {
      // Adaptive mode - learns from user interactions and audio patterns
      newVerseIndex = adaptiveSync(currentTime);
    } else {
      // Basic mode - simple linear progression
      const progress = currentTime / audio.duration;
      newVerseIndex = Math.floor(progress * lyricLines.length);
    }

    // Only update if we've moved to a new verse
    if (newVerseIndex !== currentVerseIndex && newVerseIndex >= 0 && newVerseIndex < lyricLines.length) {
      currentVerseIndex = newVerseIndex;
      updateVerseHighlighting();
    }

    // Update progress bar
    updateProgressBar();
  }
  
  function updateVerseHighlighting() {
    lyricLines.forEach((line, i) => {
      // Remove all classes first
      line.classList.remove('active', 'upcoming', 'past', 'next-verse');
      
      if (i === currentVerseIndex) {
        line.classList.add('active');
        scrollToVerse(line);
      } else if (i === currentVerseIndex + 1) {
        line.classList.add('next-verse');
      } else if (i > currentVerseIndex && i <= currentVerseIndex + 3) {
        line.classList.add('upcoming');
      } else if (i < currentVerseIndex) {
        line.classList.add('past');
      }
    });
  }
  
  function scrollToVerse(verseElement) {
    const rect = verseElement.getBoundingClientRect();
    const elementTop = rect.top + window.pageYOffset;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;
    
    // Calculate optimal scroll position - slightly above center for reading comfort
    const scrollTo = elementTop - (windowHeight * 0.4) + (elementHeight / 2);
    
    window.scrollTo({
      top: Math.max(0, scrollTo),
      behavior: 'smooth'
    });
  }
  
  function adaptiveSync(currentTime) {
    // Placeholder for adaptive synchronization
    // Could implement machine learning or user feedback in the future
    const progress = currentTime / audio.duration;
    return Math.floor(progress * lyricLines.length);
  }

  function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    if (audio.duration && isFinite(audio.duration)) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = progress + '%';
      
      // Update time display
      currentTimeEl.textContent = formatTime(audio.currentTime);
      totalTimeEl.textContent = formatTime(audio.duration);
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  audio.addEventListener('timeupdate', updateLyrics);
  audio.addEventListener('loadedmetadata', () => {
    updateProgressBar();
    
    // Generate verse timings when audio metadata is available
    if (lyricLines.length > 0) {
      const lines = Array.from(lyricLines).map(line => line.textContent);
      verseTimings = generateVerseTimings(lines, audio.duration);
      console.log(`🎵 Generated ${verseTimings.length} verse timings for ${audio.duration.toFixed(1)}s audio`);
    }
  });
  
  // Add click/touch functionality to progress bar
  const progressContainer = document.getElementById('progressBar').parentElement;
  
  function handleProgressSeek(e) {
    if (audio.duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clickX = clientX - rect.left;
      const width = rect.width;
      const clickProgress = Math.max(0, Math.min(1, clickX / width));
      audio.currentTime = clickProgress * audio.duration;
    }
  }
  
  progressContainer.addEventListener('click', handleProgressSeek);
  progressContainer.addEventListener('touchend', handleProgressSeek);
  
  // Enhanced sync controls
  const syncModeSelect = document.getElementById('syncModeSelect');
  const recalibrateBtn = document.getElementById('recalibrate');
  
  if (syncModeSelect) {
    syncModeSelect.addEventListener('change', (e) => {
      syncMode = e.target.value;
      console.log(`🔄 Sync mode changed to: ${syncMode}`);
      
      // Force immediate update
      if (isPlaying) {
        updateLyrics();
      }
      
      // Save preference
      localStorage.setItem('biblePlayer_syncMode', syncMode);
    });
    
    // Load saved sync mode
    const savedSyncMode = localStorage.getItem('biblePlayer_syncMode');
    if (savedSyncMode && ['basic', 'enhanced', 'adaptive'].includes(savedSyncMode)) {
      syncMode = savedSyncMode;
      syncModeSelect.value = savedSyncMode;
    }
  }
  
  if (recalibrateBtn) {
    recalibrateBtn.addEventListener('click', () => {
      if (lyricLines.length > 0 && audio.duration) {
        const lines = Array.from(lyricLines).map(line => line.textContent);
        verseTimings = generateVerseTimings(lines, audio.duration);
        currentVerseIndex = 0; // Reset to beginning
        console.log('⚡ Recalibrated verse timings');
        
        // Visual feedback
        recalibrateBtn.style.background = 'var(--accent-color)';
        recalibrateBtn.style.color = '#000';
        setTimeout(() => {
          recalibrateBtn.style.background = '';
          recalibrateBtn.style.color = '';
        }, 500);
        
        // Force immediate update
        if (isPlaying) {
          updateLyrics();
        }
      }
    });
  }
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
