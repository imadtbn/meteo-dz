

/**
 * Load weather for specific coordinates
 */
function loadWeatherForCoordinates(lat, lon, locationName) {
    const nearestCity = findNearestCity(lat, lon);
    const displayName = locationName || nearestCity.name;

    AppState.currentCity = {
        name: displayName,
        lat: lat,
        lon: lon
    };

    // Save last selected city
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CITY, JSON.stringify(AppState.currentCity));

    // Update UI
    document.getElementById('currentCity').textContent = displayName;

    // Fetch weather data
    fetchWeatherData(lat, lon);
    updateMapLocation(lat, lon, displayName);
}

/**
 * Find nearest Algerian city to coordinates
 */
function findNearestCity(lat, lon) {
    let nearest = CONFIG.DEFAULT_CITY;
    let minDistance = Infinity;

    CONFIG.ALGERIAN_CITIES.forEach(city => {
        const d = Math.sqrt(Math.pow(city.lat - lat, 2) + Math.pow(city.lon - lon, 2));
        if (d < minDistance) {
            minDistance = d;
            nearest = city;
        }
    });
    return nearest;
}

/**
 * Load default city (fallback)
 */
function loadDefaultCity() {
    const lastCity = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CITY);
    if (lastCity) {
        try {
            const city = JSON.parse(lastCity);
            loadWeatherForCoordinates(city.lat, city.lon, city.name);
            return;
        } catch (e) {
            console.error('Error loading last city:', e);
        }
    }
    loadWeatherForCoordinates(CONFIG.DEFAULT_CITY.lat, CONFIG.DEFAULT_CITY.lon, CONFIG.DEFAULT_CITY.name);
}

/**
 * Update location button visual state
 */
function updateLocationButtonState(active) {
    const btn = document.getElementById('locationBtn');
    if (active) {
        btn.style.color = 'var(--gold)';
        btn.style.borderColor = 'var(--gold)';
        btn.innerHTML = '<i class="fas fa-location-dot"></i>';
    } else {
        btn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
    }
}

// ============================================================
//  WEATHER DATA MODULE
// ============================================================

async function fetchWeatherData(lat, lon) {
    try {
        showLoading(true);

        // Note: Using demo data since API key is placeholder
        await simulateNetworkDelay();

        const demoData = generateDemoWeatherData(lat, lon);
        AppState.weatherData = demoData;

        updateCurrentWeather(demoData.current);
        updateHourlyForecast(demoData.hourly);
        updateDailyForecast(demoData.daily);
        updateSeaState(demoData.sea);
        updateStats(demoData.stats);
        updateTips(demoData.tips);
        updateCubeTemps();


        document.getElementById('updateTime').textContent = new Date().toLocaleTimeString('ar-DZ');
        showApiStatus(true);

    } catch (error) {
        console.error('Weather fetch error:', error);
        showAlert('خطأ في تحميل بيانات الطقس', 'danger');
        showApiStatus(false);
    } finally {
        showLoading(false);
    }
}

function generateDemoWeatherData(lat, lon) {
    const baseTemp = 25 + (36 - lat) * 0.8;
    const isCoastal = lon > -1 && lon < 8 && lat > 36;

    return {
        current: {
            temp: Math.round(baseTemp),
            condition: isCoastal ? 'سماء صافية' : 'غائم جزئياً',
            icon: isCoastal ? 'fa-sun' : 'fa-cloud-sun',
            humidity: Math.round(40 + Math.random() * 40),
            wind: Math.round(10 + Math.random() * 20),
            pressure: 1013 + Math.round(Math.random() * 10 - 5),
            visibility: 10,
            uv: Math.round(6 + Math.random() * 4),
            feels_like: Math.round(baseTemp + 2)
        },
        hourly: Array.from({
            length: 24
        }, (_, i) => ({
            time: `${i}:00`,
            temp: Math.round(baseTemp + Math.sin((i - 6) * Math.PI / 12) * 8),
            icon: i > 6 && i < 18 ? 'fa-sun' : 'fa-moon',
            desc: i > 6 && i < 18 ? 'صافٍ' : 'ليلاً'
        })),
        daily: Array.from({
            length: 7
        }, (_, i) => {
            const dayTemp = baseTemp + Math.random() * 6 - 3;
            return {
                day: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][(new Date().getDay() + i) % 7],
                date: new Date(Date.now() + i * 86400000).toLocaleDateString('ar-DZ', {
                    day: 'numeric',
                    month: 'short'
                }),
                high: Math.round(dayTemp + 5),
                low: Math.round(dayTemp - 5),
                condition: Math.random() > 0.7 ? 'ممطر' : 'صافٍ',
                icon: Math.random() > 0.7 ? 'fa-cloud-rain' : 'fa-sun'
            };
        }),
        sea: {
            waveHeight: isCoastal ? (0.5 + Math.random() * 1.5).toFixed(1) : '--',
            waveDirection: ['شمالي', 'شمالي غربي', 'غربي'][Math.floor(Math.random() * 3)],
            wavePeriod: (4 + Math.random() * 4).toFixed(1)
        },
        stats: {
            maxTemp: Math.round(baseTemp + 8),
            minTemp: Math.round(baseTemp - 8),
            rain: Math.round(Math.random() * 20),
            wind: Math.round(15 + Math.random() * 15)
        },
        tips: [{
            icon: 'fa-sun',
            title: 'حماية من الشمس',
            text: 'مؤشر الأشعة فوق البنفسجية مرتفع. استخدم واقي الشمس.',
            severity: 'medium'
        }, {
            icon: 'fa-tint',
            title: 'ترطيب الجسم',
            text: 'اشرب 8-10 أكواب من الماء يومياً.',
            severity: 'low'
        }, {
            icon: 'fa-umbrella',
            title: 'استعد للأمطار',
            text: 'توقعات بهطول أمطار غداً.',
            severity: 'medium'
        }]
    };
}

function simulateNetworkDelay() {
    return new Promise(resolve => setTimeout(resolve, 800));
}

// ============================================================
//  UI UPDATE FUNCTIONS
// ============================================================

function updateCurrentWeather(data) {
    document.getElementById('currentTemp').textContent = `${data.temp}°`;
    document.getElementById('currentCondition').textContent = data.condition;
    document.getElementById('weatherIcon').innerHTML = `<i class="fas ${data.icon}"></i>`;

    const detailsHTML = `
<div class="detail-card"><div class="detail-card-icon"><i class="fas fa-wind"></i></div><div class="detail-card-value">${data.wind} km/h</div><div class="detail-card-label">سرعة الرياح</div></div>
<div class="detail-card"><div class="detail-card-icon"><i class="fas fa-tint"></i></div><div class="detail-card-value">${data.humidity}%</div><div class="detail-card-label">الرطوبة</div></div>
<div class="detail-card"><div class="detail-card-icon"><i class="fas fa-compress-arrows-alt"></i></div><div class="detail-card-value">${data.pressure} hPa</div><div class="detail-card-label">الضغط</div></div>
<div class="detail-card"><div class="detail-card-icon"><i class="fas fa-eye"></i></div><div class="detail-card-value">${data.visibility} km</div><div class="detail-card-label">الرؤية</div></div>
`;
    document.getElementById('weatherDetails').innerHTML = detailsHTML;
}

function updateHourlyForecast(hourly) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = hourly.map(h => `
<div class="hourly-card">
    <div class="hourly-time">${h.time}</div>
    <div class="hourly-icon"><i class="fas ${h.icon}"></i></div>
    <div class="hourly-temp">${h.temp}°</div>
    <div class="hourly-desc">${h.desc}</div>
</div>
`).join('');
}

function updateDailyForecast(daily) {
    const container = document.getElementById('forecastContainer');
    container.innerHTML = daily.map(d => `
<div class="forecast-card">
    <div class="forecast-day">${d.day}</div>
    <div class="forecast-date">${d.date}</div>
    <div class="forecast-icon"><i class="fas ${d.icon}"></i></div>
    <div class="forecast-condition">${d.condition}</div>
    <div class="forecast-temps">
        <span class="forecast-high">${d.high}°</span>
        <span class="forecast-low">${d.low}°</span>
    </div>
</div>
`).join('');
}

function updateSeaState(sea) {
    document.getElementById('waveHeight').textContent = sea.waveHeight;
    document.getElementById('waveDirection').textContent = sea.waveDirection;
    document.getElementById('wavePeriod').textContent = sea.wavePeriod;
}

function updateStats(stats) {
    document.getElementById('statMaxTemp').textContent = stats.maxTemp + '°';
    document.getElementById('statMinTemp').textContent = stats.minTemp + '°';
    document.getElementById('statRain').textContent = stats.rain + 'mm';
    document.getElementById('statWind').textContent = stats.wind + 'km/h';

    initChart();
}

function updateTips(tips) {
    const container = document.getElementById('weatherTips');
    container.innerHTML = tips.map(t => `
<div class="tip-card">
    <div class="tip-icon"><i class="fas ${t.icon}"></i></div>
    <h3 class="tip-title">${t.title}</h3>
    <p class="tip-text">${t.text}</p>
    <span class="tip-severity ${t.severity}">${t.severity === 'high' ? 'تحذير' : t.severity === 'medium' ? 'تنبيه متوسط' : 'نصيحة عامة'}</span>
</div>
`).join('');
}

function updateCubeTemps() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`cubeTemp${i}`);
        if (el) el.textContent = Math.round(20 + Math.random() * 15) + '°';
    }
}

// ============================================================
//  MAP MODULE (Leaflet)
// ============================================================



// ============================================================
//  CHART MODULE (Chart.js)
// ============================================================

function initChart() {
    const ctx = document.getElementById('temperatureChart');
    if (!ctx) return;

    if (AppState.chart) AppState.chart.destroy();

    const labels = Array.from({
        length: 7
    }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toLocaleDateString('ar-DZ', {
            weekday: 'short'
        });
    });

    const data = labels.map(() => Math.round(20 + Math.random() * 15));

    AppState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'درجة الحرارة (°C)',
                data: data,
                borderColor: '#d4a853',
                backgroundColor: 'rgba(212, 168, 83, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#d4a853',
                pointBorderColor: '#fff',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    color: '#e8e0d0',
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value + '°'
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#a09888'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a09888'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// ============================================================
//  SEARCH & AUTOCOMPLETE
// ============================================================

function initSearch() {
    const input = document.getElementById('searchInput');
    const suggestions = document.getElementById('citySuggestions');

    input.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (val.length < 1) {
            suggestions.classList.remove('visible');
            return;
        }

        const matches = CONFIG.ALGERIAN_CITIES.filter(c =>
            c.name.includes(val) || c.name.toLowerCase().includes(val)
        );

        if (matches.length > 0) {
            suggestions.innerHTML = matches.map(c => `
        <div class="city-suggestion-item" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}">
            <div class="city-name">${c.name}</div>
            <div class="city-region">${c.region}</div>
        </div>
    `).join('');
            suggestions.classList.add('visible');
        } else {
            suggestions.classList.remove('visible');
        }
    });

    suggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.city-suggestion-item');
        if (!item) return;

        const {
            lat,
            lon,
            name
        } = item.dataset;
        input.value = name;
        suggestions.classList.remove('visible');
        loadWeatherForCoordinates(parseFloat(lat), parseFloat(lon), name);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            suggestions.classList.remove('visible');
        }
    });
}

// ============================================================
//  THREE.JS STAR BACKGROUND
// ============================================================

function initStarCanvas() {
    const canvas = document.getElementById('starCanvas');
    if (!canvas || !window.THREE) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const posArray = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 100;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.15,
        color: 0xd4a853,
        transparent: true,
        opacity: 0.8
    });

    const starsMesh = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starsMesh);
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        starsMesh.rotation.x += 0.0002;
        starsMesh.rotation.y += 0.0003;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================

function showAlert(message, type = 'info') {
    const banner = document.getElementById('alertBanner');
    const text = document.getElementById('alertText');
    text.textContent = message;
    banner.className = `alert-banner visible ${type}`;

    setTimeout(() => {
        banner.classList.remove('visible');
    }, 4000);
}

function showApiStatus(connected) {
    const status = document.getElementById('apiStatus');
    if (connected) {
        status.classList.remove('error');
        status.innerHTML = '<i class="fas fa-check-circle"></i><span>متصل</span>';
    } else {
        status.classList.add('error');
        status.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>غير متصل</span>';
    }
}

function showLoading(show) {
    // Could add a global spinner
}

// ============================================================
//  EVENT LISTENERS
// ============================================================


function initNews() {
    const newsGrid = document.getElementById('newsGrid');
    const newsItems = [{
        cat: 'weather',
        title: 'توقعات بأمطار غزيرة على الشمال',
        excerpt: 'توقعات بهطول أمطار غزيرة على الولايات الشمالية خلال الـ 48 ساعة القادمة...',
        time: 'منذ ساعة',
        img: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=400'
    }, {
        cat: 'alert',
        title: 'تحذير من موجة حر في الجنوب',
        excerpt: 'أصدرت مصالح الأرصاد الجوية تحذيراً من موجة حر شديدة في ولايات الجنوب...',
        time: 'منذ 3 ساعات',
        img: 'https://images.unsplash.com/photo-1504370805625-d32c54b16100?w=400'
    }, {
        cat: 'climate',
        title: 'دراسة: تغير المناخ يؤثر على المحاصيل',
        excerpt: 'أظهرت دراسة جديدة تأثيرات تغير المناخ على الزراعة في الهضاب العليا...',
        time: 'منذ 5 ساعات',
        img: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400'
    }];

    newsGrid.innerHTML = newsItems.map(n => `
<div class="news-card">
    <div class="news-image"><img src="${n.img}" alt="${n.title}" loading="lazy"></div>
    <div class="news-content">
        <span class="news-category ${n.cat}">${n.cat === 'weather' ? 'طقس' : n.cat === 'alert' ? 'تحذير' : 'مناخ'}</span>
        <h3 class="news-title">${n.title}</h3>
        <p class="news-excerpt">${n.excerpt}</p>
        <div class="news-meta"><span><i class="fas fa-clock"></i> ${n.time}</span><span><i class="fas fa-eye"></i> ${Math.floor(Math.random()*5000)}</span></div>
    </div>
</div>
`).join('');
}

// ============================================================
//  SHADER / WEBGL EFFECT
// ============================================================

function initShader() {
    const canvas = document.getElementById('shaderCanvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const vs = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

    const fs = `
precision mediump float;
uniform float time;
uniform vec2 resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float wave = sin(uv.x * 10.0 + time) * 0.1;
    float wave2 = cos(uv.y * 8.0 - time * 0.5) * 0.1;
    float pattern = smoothstep(0.4, 0.6, uv.y + wave + wave2);
    vec3 color = mix(vec3(0.04, 0.055, 0.1), vec3(0.13, 0.23, 0.37), pattern);
    gl_FragColor = vec4(color, 1.0);
}
`;

    function createShader(type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, 'time');
    const resLoc = gl.getUniformLocation(prog, 'resolution');
    gl.uniform2f(resLoc, canvas.width, canvas.height);

    let start = Date.now();

    function render() {
        gl.uniform1f(timeLoc, (Date.now() - start) * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    render();
}

// ============================================================
//  MAIN INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌤️ Algeria Weather App Initialized');

    initStarCanvas();
    initSearch();
    initNews();
    initShader();

    // 🔑 CORE FEATURE: Request geolocation on first visit & store in localStorage


    // GSAP Animations
    if (window.gsap) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.utils.toArray('.weather-card, .forecast-card, .stat-card, .tip-card').forEach(el => {
            gsap.from(el, {
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%'
                },
                y: 30,
                opacity: 0,
                duration: 0.6,
                ease: 'power2.out'
            });
        });
    }
});