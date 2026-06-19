// ============================================================
//  Algeria Weather - Main Application Script
//  Features: Geolocation, LocalStorage, Weather API, Maps, Charts
// ============================================================

// --- Configuration ---
const CONFIG = {
    API_KEY: 'YOUR_API_KEY_HERE', // استبدل بمفتاح OpenWeatherMap
    DEFAULT_CITY: {
        name: 'الجزائر العاصمة',
        lat: 36.7538,
        lon: 3.0588
    },
    STORAGE_KEYS: {
        GEO_LOCATION: 'dz_weather_geo',
        LAST_CITY: 'dz_weather_last_city',
        FIRST_VISIT: 'dz_weather_first_visit'
    },
    ALGERIAN_CITIES: [{
        name: 'الجزائر العاصمة',
        lat: 36.7538,
        lon: 3.0588,
        region: 'الوسط'
    }, {
        name: 'وهران',
        lat: 35.6971,
        lon: -0.6308,
        region: 'الغرب'
    }, {
        name: 'قسنطينة',
        lat: 36.3650,
        lon: 6.6147,
        region: 'الشرق'
    }, {
        name: 'عنابة',
        lat: 36.9184,
        lon: 7.7591,
        region: 'الشرق'
    }, {
        name: 'البليدة',
        lat: 36.4801,
        lon: 2.8319,
        region: 'الوسط'
    }, {
        name: 'سطيف',
        lat: 36.1898,
        lon: 5.4108,
        region: 'الشرق'
    }, {
        name: 'تمنراست',
        lat: 22.7850,
        lon: 5.5228,
        region: 'الجنوب'
    }, {
        name: 'ورقلة',
        lat: 31.9526,
        lon: 5.3340,
        region: 'الجنوب'
    }, {
        name: 'بسكرة',
        lat: 34.8500,
        lon: 5.7333,
        region: 'الجنوب'
    }, {
        name: 'تيزي وزو',
        lat: 36.7118,
        lon: 4.0456,
        region: 'الشمال'
    }, {
        name: 'بجاية',
        lat: 36.7515,
        lon: 5.0557,
        region: 'الشمال'
    }, {
        name: 'سعيدة',
        lat: 34.8303,
        lon: 0.1517,
        region: 'الغرب'
    }, {
        name: 'المدية',
        lat: 36.2676,
        lon: 2.7500,
        region: 'الوسط'
    }, {
        name: 'تيارت',
        lat: 35.3710,
        lon: 1.3160,
        region: 'الغرب'
    }, {
        name: 'الشلف',
        lat: 36.1653,
        lon: 1.3345,
        region: 'الوسط'
    }, {
        name: 'سكيكدة',
        lat: 36.8667,
        lon: 6.9000,
        region: 'الشرق'
    }, {
        name: 'جيجل',
        lat: 36.8206,
        lon: 5.7667,
        region: 'الشرق'
    }, {
        name: 'أدرار',
        lat: 27.8742,
        lon: -0.2939,
        region: 'الجنوب'
    }, {
        name: 'تندوف',
        lat: 27.6717,
        lon: -8.1474,
        region: 'الجنوب'
    }, {
        name: 'إليزي',
        lat: 26.4833,
        lon: 8.4667,
        region: 'الجنوب'
    }]
};

// --- State Management ---
const AppState = {
    currentCity: null,
    weatherData: null,
    map: null,
    chart: null,
    isFirstVisit: false
};

// ============================================================
//  GEOLOCATION & LOCAL STORAGE MODULE
//  المطلوب: طلب الموقع عند أول استخدام + تخزين البيانات
// ============================================================

/**
 * Initialize Geolocation on first visit
 * يتحقق من زيارة المستخدم الأولى ويطلب الموقع الجغرافي
 */
function initGeolocation() {
    const hasVisited = localStorage.getItem(CONFIG.STORAGE_KEYS.FIRST_VISIT);
    const storedGeo = localStorage.getItem(CONFIG.STORAGE_KEYS.GEO_LOCATION);

    // تحديد ما إذا كانت هذه الزيارة الأولى
    if (!hasVisited) {
        AppState.isFirstVisit = true;
        localStorage.setItem(CONFIG.STORAGE_KEYS.FIRST_VISIT, 'true');

        // طلب الموقع الجغرافي فوراً عند أول زيارة
        requestUserLocation();
    } else if (storedGeo) {
        // إذا كان الموقع مخزناً سابقاً، استخدمه
        try {
            const geoData = JSON.parse(storedGeo);
            console.log('📍 Loaded stored location:', geoData);
            loadWeatherForCoordinates(geoData.lat, geoData.lon, geoData.name || 'موقعك');
        } catch (e) {
            console.error('Error parsing stored geo data:', e);
            loadDefaultCity();
        }
    } else {
        // زيارة سابقة لكن بدون موقع مخزن
        loadDefaultCity();
    }
}

/**
 * Request user location via Browser Geolocation API
 * يطلب إذن المستخدم للوصول إلى الموقع الجغرافي
 */
function requestUserLocation() {
    if (!navigator.geolocation) {
        showAlert('متصفحك لا يدعم تحديد الموقع الجغرافي', 'warning');
        loadDefaultCity();
        return;
    }

    showAlert('جاري طلب إذن الموقع الجغرافي...', 'info');

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        // Success Callback
        (position) => {
            const geoData = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                name: 'موقعك الحالي'
            };

            // تخزين البيانات الجغرافية في المتصفح (localStorage)
            localStorage.setItem(CONFIG.STORAGE_KEYS.GEO_LOCATION, JSON.stringify(geoData));

            console.log('✅ Geolocation saved:', geoData);
            showAlert('تم حفظ موقعك بنجاح!', 'success');

            // تحميل بيانات الطقس للموقع المحدد
            loadWeatherForCoordinates(geoData.lat, geoData.lon, geoData.name);

            // تحديث زر الموقع
            updateLocationButtonState(true);
        },
        // Error Callback
        (error) => {
            let message = 'تعذر تحديد الموقع';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'تم رفض إذن الموقع. يمكنك البحث يدوياً.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'معلومات الموقع غير متوفرة حالياً.';
                    break;
                case error.TIMEOUT:
                    message = 'انتهت مهلة طلب الموقع.';
                    break;
            }
            console.warn('Geolocation error:', error);
            showAlert(message, 'warning');
            loadDefaultCity();
        },
        options
    );
}

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

function initMap() {
    if (AppState.map) return;

    AppState.map = L.map('weatherMap').setView([36.7538, 3.0588], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
    }).addTo(AppState.map);

    CONFIG.ALGERIAN_CITIES.slice(0, 10).forEach(city => {
        L.marker([city.lat, city.lon])
            .addTo(AppState.map)
            .bindPopup(`<<b>${city.name}</b><br>اضغط لعرض الطقس`)
            .on('click', () => loadWeatherForCoordinates(city.lat, city.lon, city.name));
    });
}

function updateMapLocation(lat, lon, name) {
    if (!AppState.map) initMap();
    AppState.map.setView([lat, lon], 10);
    L.marker([lat, lon]).addTo(AppState.map)
        .bindPopup(`<<b>${name}</b><br>موقعك الحالي`)
        .openPopup();
}

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

function initEventListeners() {
    // Location button
    document.getElementById('locationBtn').addEventListener('click', () => {
        requestUserLocation();
    });

    // Refresh button
    document.getElementById('refreshWeather').addEventListener('click', () => {
        if (AppState.currentCity) {
            loadWeatherForCoordinates(AppState.currentCity.lat, AppState.currentCity.lon, AppState.currentCity.name);
        }
    });

    // Close alert
    document.getElementById('closeAlert').addEventListener('click', () => {
        document.getElementById('alertBanner').classList.remove('visible');
    });

    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
        document.getElementById('mainNav').classList.toggle('active');
    });

    // Scroll to top
    const scrollTop = document.getElementById('scrollTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollTop.classList.add('visible');
        } else {
            scrollTop.classList.remove('visible');
        }
    });
    scrollTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Header scroll effect
    const header = document.getElementById('siteHeader');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Map layer buttons
    document.querySelectorAll('.map-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
            e.target.closest('.map-btn').classList.add('active');
        });
    });

    // Stats tabs
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Footer city links
    document.querySelectorAll('.footer-links a[data-city]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const cityName = e.target.closest('a').dataset.city;
            const city = CONFIG.ALGERIAN_CITIES.find(c =>
                c.name.includes(cityName) || cityName.includes(c.name)
            );
            if (city) {
                loadWeatherForCoordinates(city.lat, city.lon, city.name);
                document.getElementById('home').scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Refresh news
    document.getElementById('refreshNews').addEventListener('click', () => {
        const newsGrid = document.getElementById('newsGrid');
        newsGrid.innerHTML = '<div class="text-center" style="grid-column:1/-1;padding:2rem;"><div class="spinner"></div></div>';
        setTimeout(() => initNews(), 1000);
    });
}

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
    initMap();
    initSearch();
    initEventListeners();
    initNews();
    initShader();

    // 🔑 CORE FEATURE: Request geolocation on first visit & store in localStorage
    initGeolocation();

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