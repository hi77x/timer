let tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

let audioContext, analyser, source;
let audio = new Audio();
let musicInfo = document.querySelector('.music-info');
let canvas = document.querySelector('.visualizer');
let ctx = canvas.getContext('2d');
let isPlaying = false;
let playlist = [];
let currentTrack = 0;
let hueRotation = 0;
let wavePoints = [];
const numPoints = 200;
let isRepeat = false;

// Инициализация точек волны
for (let i = 0; i < numPoints; i++) {
  wavePoints.push({
    x: i * (window.innerWidth / numPoints),
    y: 0,
    amplitude: Math.random() * 30
  });
}

// Загрузка плейлиста из localStorage
const savedPlaylist = localStorage.getItem('playlist');
const savedFiles = localStorage.getItem('audioFiles');
if (savedPlaylist && savedFiles) {
  playlist = JSON.parse(savedPlaylist);
  const files = JSON.parse(savedFiles);
  playlist.forEach((track, index) => {
    const base64Data = files[index];
    if (base64Data) {
      const blob = base64ToBlob(base64Data);
      if (blob) {
        track.url = URL.createObjectURL(blob);
      }
    }
  });
  updatePlaylistUI();
}

function base64ToBlob(base64) {
  if (!base64 || !base64.includes(',')) return null;
  const parts = base64.split(',');
  const byteString = atob(parts[1]);
  const mimeString = parts[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
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
  wavePoints = wavePoints.map((point, i) => ({
    ...point,
    x: i * (window.innerWidth / numPoints)
  }));
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
  
  // Обновляем значения точек: базовая линия у нижнего края
  wavePoints.forEach((point, i) => {
    const frequency = dataArray[Math.floor(i / wavePoints.length * bufferLength)] / 255;
    point.y = frequency * 80;
  });
  
  // Рисуем сплошную линию от нижнего края вверх по амплитуде
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let i = 0; i < wavePoints.length; i++) {
    const point = wavePoints[i];
    let y = canvas.height - point.y;
    ctx.lineTo(point.x, y);
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
    
    // Название трека (по клику запускает воспроизведение)
    const title = document.createElement('span');
    title.textContent = track.name;
    title.style.flexGrow = 1;
    title.style.cursor = 'pointer';
    title.onclick = () => playTrack(index);
    item.appendChild(title);
    
    // Кнопка удаления
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
  // Перезаписываем сохранённые файлы, если необходимо обновить массив base64
  const audioFiles = [];
  localStorage.setItem('audioFiles', JSON.stringify(audioFiles));
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
  const audioFiles = [];
  
  for (let file of files) {
    const reader = new FileReader();
    const promise = new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
    });
    reader.readAsDataURL(file);
    const base64Data = await promise;
    audioFiles.push(base64Data);
    
    const url = URL.createObjectURL(file);
    playlist.push({
      name: file.name,
      url: url
    });
  }
  
  localStorage.setItem('audioFiles', JSON.stringify(audioFiles));
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
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(function(error) {
      console.log('Ошибка блокировки ориентации:', error);
    });
  }
}

rotateScreen();

let isRunning = false;
let interval;
let seconds = 0;
let minutes = 0;
let hours = 0;
const displays = document.querySelectorAll('.display');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fullscreenDiv = document.querySelector('.fullscreen');
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');

function updateDisplays() {
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  displays.forEach(display => {
    display.innerHTML = timeString.split('').map(char =>
      char === ':' ? ':' : `<span class="digit">${char}</span>`
    ).join('');
  });
}

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

function toggleFullscreen() {
  fullscreenDiv.classList.toggle('active');
  menuBtn.classList.toggle('hidden');
  menu.classList.remove('active');
  if (fullscreenDiv.classList.contains('active')) {
    document.documentElement.requestFullscreen().catch(console.error);
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }
}

function toggleMenu() {
  menu.classList.toggle('active');
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
  if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
    menu.classList.remove('active');
  }
});

document.addEventListener('dblclick', () => {
  if (fullscreenDiv.classList.contains('active')) {
    toggleFullscreen();
  }
});

tg.requestFullscreen();
tg.ready();
