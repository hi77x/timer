// Убраны все обращения к Telegram API

let audioContext, analyser, source;
let audio = new Audio();
let musicInfo = document.querySelector('.music-info');
let canvas = document.querySelector('.visualizer');
let ctx = canvas.getContext('2d');
let isPlaying = false;
let playlist = [];
let currentTrack = 0;
let hueRotation = 0;
const numPoints = 200;
let isRepeat = false;

// Загрузка плейлиста из localStorage (только метаданные)
const savedPlaylist = localStorage.getItem('playlist');
if (savedPlaylist) {
  playlist = JSON.parse(savedPlaylist);
  updatePlaylistUI();
}

function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 512;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = 200;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawVisualizer() {
  if (!audioContext || !isPlaying) return;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hueRotation = (hueRotation + 0.5) % 360;
  
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  
  // Рисуем волну из numPoints по всей ширине канваса
  for (let i = 0; i < numPoints; i++) {
    let x = i * (canvas.width / (numPoints - 1));
    let freqIndex = Math.floor(i / (numPoints - 1) * (bufferLength - 1));
    let frequency = dataArray[freqIndex] / 255;
    let y = canvas.height - frequency * 80;
    ctx.lineTo(x, y);
  }
  
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, `hsla(${hueRotation}, 100%, 50%, 0.5)`);
  gradient.addColorStop(0.5, `hsla(${(hueRotation + 120) % 360}, 100%, 50%, 0.5)`);
  gradient.addColorStop(1, `hsla(${(hueRotation + 240) % 360}, 100%, 50%, 0.5)`);
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  requestAnimationFrame(drawVisualizer);
}

function updatePlaylistUI() {
  const playlistElement = document.getElementById('playlist');
  playlistElement.innerHTML = '';
  
  playlist.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = `playlist-item ${index === currentTrack ? 'active' : ''}`;
    
    const title = document.createElement('span');
    title.textContent = track.name;
    title.style.flexGrow = 1;
    title.style.cursor = 'pointer';
    title.onclick = () => playTrack(index);
    item.appendChild(title);
    
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTrack(index);
    };
    item.appendChild(delBtn);
    
    playlistElement.appendChild(item);
  });
  
  localStorage.setItem('playlist', JSON.stringify(playlist));
}

function deleteTrack(index) {
  playlist.splice(index, 1);
  if (index === currentTrack) {
    audio.pause();
    isPlaying = false;
    document.getElementById('playPauseBtn').textContent = '⏵';
  } else if (index < currentTrack) {
    currentTrack--;
  }
  updatePlaylistUI();
}

function playTrack(index) {
  if (index >= 0 && index < playlist.length) {
    currentTrack = index;
    audio.src = playlist[index].url;
    musicInfo.textContent = playlist[index].name;
    audio.play();
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '⏸';
    updatePlaylistUI();
    
    if (!audioContext) {
      initAudio();
    }
    drawVisualizer();
  }
}

document.getElementById('prevBtn').addEventListener('click', () => {
  playTrack(currentTrack - 1 >= 0 ? currentTrack - 1 : playlist.length - 1);
});

document.getElementById('nextBtn').addEventListener('click', () => {
  playTrack(currentTrack + 1 < playlist.length ? currentTrack + 1 : 0);
});

document.getElementById('repeatBtn').addEventListener('click', (e) => {
  isRepeat = !isRepeat;
  e.target.classList.toggle('active');
});

audio.addEventListener('ended', () => {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playTrack(currentTrack + 1 < playlist.length ? currentTrack + 1 : 0);
  }
});

const audioInput = document.getElementById('audioInput');
document.getElementById('musicBtn').addEventListener('click', () => {
  audioInput.click();
});

audioInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  
  for (let file of files) {
    const url = URL.createObjectURL(file);
    playlist.push({
      name: file.name,
      url: url
    });
  }
  
  updatePlaylistUI();
  
  if (playlist.length === files.length) {
    playTrack(0);
  }
});

document.getElementById('playPauseBtn').addEventListener('click', () => {
  if (isPlaying) {
    audio.pause();
    document.getElementById('playPauseBtn').textContent = '⏵';
  } else {
    audio.play();
    document.getElementById('playPauseBtn').textContent = '⏸';
    if (!audioContext) {
      initAudio();
    }
    drawVisualizer();
  }
  isPlaying = !isPlaying;
});

document.querySelector('.volume-slider').addEventListener('input', (e) => {
  audio.volume = e.target.value / 100;
});

audio.addEventListener('timeupdate', () => {
  let progress = (audio.currentTime / audio.duration) * 100;
  document.querySelector('.progress').style.width = `${progress}%`;
});

document.querySelector('.progress-bar').addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percentage = x / rect.width;
  audio.currentTime = percentage * audio.duration;
});

function rotateScreen() {
  // Для мобильных браузеров можно попробовать запросить полноэкранный режим при клике
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(console.error);
  }
}

// Функция полноэкранного режима (режим "Только цифры")
function toggleFullscreen() {
  const fullscreenDiv = document.querySelector('.fullscreen');
  const menuBtn = document.getElementById('menuBtn');
  fullscreenDiv.classList.toggle('active');
  menuBtn.classList.toggle('hidden');
  document.getElementById('menu').classList.remove('active');
  
  if (fullscreenDiv.classList.contains('active')) {
    document.documentElement.requestFullscreen().catch(console.error);
  } else if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function toggleMenu() {
  document.getElementById('menu').classList.toggle('active');
}

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const menuBtn = document.getElementById('menuBtn');
const displays = document.querySelectorAll('.display');

function updateDisplays() {
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  displays.forEach(display => {
    display.innerHTML = timeString.split('').map(char =>
      char === ':' ? ':' : `<span class="digit">${char}</span>`
    ).join('');
  });
}

let isRunning = false;
let interval;
let seconds = 0;
let minutes = 0;
let hours = 0;

function toggleTimer() {
  if (isRunning) {
    clearInterval(interval);
    startBtn.textContent = 'Старт';
  } else {
    interval = setInterval(() => {
      seconds++;
      if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
          minutes = 0;
          hours++;
        }
      }
      updateDisplays();
    }, 1000);
    startBtn.textContent = 'Пауза';
  }
  isRunning = !isRunning;
}

function resetTimer() {
  clearInterval(interval);
  seconds = 0;
  minutes = 0;
  hours = 0;
  isRunning = false;
  startBtn.textContent = 'Старт';
  updateDisplays();
}


startBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
fullscreenBtn.addEventListener('click', toggleFullscreen);
menuBtn.addEventListener('click', toggleMenu);

window.addEventListener('load', () => {
  menuBtn.style.display = 'block';
  menuBtn.addEventListener('click', toggleMenu);
});

document.addEventListener('click', (e) => {
  const menu = document.getElementById('menu');
  if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
    menu.classList.remove('active');
  }
});

document.addEventListener('dblclick', () => {
  const fullscreenDiv = document.querySelector('.fullscreen');
  if (fullscreenDiv.classList.contains('active')) {
    toggleFullscreen();
  }
});
