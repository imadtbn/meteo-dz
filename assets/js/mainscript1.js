// ═══════════════════════════════════════════════════════════════
//  الطقس الجزائري - Algeria Weather Pro
//  كود موحد ومحسّن | آخر تحديث: 2026-06-29
// ═══════════════════════════════════════════════════════════════

// ============================================
// 1. CONFIGURATION
// ============================================
const CONFIG = {
    OPENWEATHER_API_KEY: '1151122405b6f7be33bf0de4b22bb5a4',
    DEFAULT_LOCATION: {
        lat: 36.752887,
        lon: 3.042048,
        name: 'الجزائر العاصمة',
        state: 'الجزائر العاصمة',
        country: 'الجزائر',
        displayName: 'الجزائر العاصمة / الجزائر العاصمة / الجزائر'
    },
    REFRESH_INTERVAL: 25 * 60 * 1000,
    CACHE_DURATION: 30 * 60 * 1000,
    GEO_TIMEOUT: 10000,
    API_BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEO_API_URL: 'https://api.openweathermap.org/geo/1.0',
    NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
    TILE_URL: 'https://tile.openweathermap.org/map'
};

// ============================================
// 2. STATE & CACHE
// ============================================
const AppState = {
    currentLocation: null,
    currentWeather: null,
    forecastData: null,
    temperatureChart: null,
    currentLayer: 'temperature',
    tileLayers: {},
    isLoading: false,
    lastUpdate: null,

    init() {
        const cached = LocationCache.get();
        if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION)) {
            this.currentLocation = cached.data;
            return this.currentLocation;
        }
        this.currentLocation = { ...CONFIG.DEFAULT_LOCATION };
        return this.currentLocation;
    },

    setLocation(location) {
        this.currentLocation = location;
        LocationCache.set(location);
    },

    setWeather(data) {
        this.currentWeather = data;
        this.lastUpdate = Date.now();
    }
};

const LocationCache = {
    KEY: 'algeria_weather_location_v2',
    set(location) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify({
                data: location,
                timestamp: Date.now()
            }));
        } catch (e) { console.warn('[Cache] Save failed:', e); }
    },
    get() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }
};

// ============================================
// 3. NOTIFICATION
// ============================================
const Notify = {
    el: null, txt: null, timer: null,
    init() {
        this.el = document.getElementById('alertBanner');
        this.txt = document.getElementById('alertText');
        document.getElementById('closeAlert')?.addEventListener('click', () => this.hide());
    },
    show(msg, type = 'info', duration = 5000) {
        if (this.timer) clearTimeout(this.timer);
        this.txt.textContent = msg;
        this.el.className = `alert-banner visible ${type}`;
        if (duration > 0) this.timer = setTimeout(() => this.hide(), duration);
    },
    hide() { this.el?.classList.remove('visible'); },
    loading(msg) { this.show(msg, 'info', 0); },
    success(msg) { this.show(msg, 'success', 3000); },
    error(msg) { this.show(msg, 'error', 6000); },
    warning(msg) { this.show(msg, 'warning', 5000); }
};

// ============================================
// 4. GEOLOCATION SERVICE
// ============================================
const GeoService = {
    async requestGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('المتصفح لا يدعم تحديد الموقع الجغرافي'));
                return;
            }
            Notify.loading('جارٍ تحديد موقعك...');
            navigator.geolocation.getCurrentPosition(
                pos => resolve(pos),
                err => reject(this._gpsError(err)),
                { enableHighAccuracy: true, timeout: CONFIG.GEO_TIMEOUT, maximumAge: 0 }
            );
        });
    },

    _gpsError(err) {
        const msgs = {
            1: 'تم رفض إذن الوصول إلى الموقع. يرجى السماح بالوصول من إعدادات المتصفح.',
            2: 'معلومات الموقع غير متاحة حالياً.',
            3: 'انتهت مهلة تحديد الموقع.',
            0: 'حدث خطأ غير معروف أثناء تحديد الموقع.'
        };
        return new Error(msgs[err.code] || msgs[0]);
    },

    async reverseGeocode(lat, lon) {
        // المحاولة الأولى: OpenWeatherMap
        try {
            const url = `${CONFIG.GEO_API_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.OPENWEATHER_API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('OWM failed');
            const data = await res.json();
            if (data?.length > 0) {
                const loc = this._parseOWM(data[0], lat, lon);
                if (loc.name && /[\u0600-\u06FF]/.test(loc.name)) return loc; // إذا كان الاسم عربياً نعتمدها
            }
        } catch (e) { console.warn('[Geo] OWM reverse failed:', e); }

        // المحاولة الثانية: Nominatim (أدق للعربية)
        return this._reverseNominatim(lat, lon);
    },

    async _reverseNominatim(lat, lon) {
        try {
            const url = `${CONFIG.NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=ar`;
            const res = await fetch(url, { headers: { 'User-Agent': 'meteo-dz/2.0' } });
            if (!res.ok) throw new Error('Nominatim failed');
            const data = await res.json();
            return this._parseNominatim(data, lat, lon);
        } catch (e) {
            console.warn('[Geo] Nominatim failed:', e);
            return this._fallback(lat, lon);
        }
    },

    _parseOWM(data, lat, lon) {
        const names = data.local_names || {};
        const name = names.ar || names.fr || data.name || 'موقع غير معروف';
        const state = data.state || '';
        const country = names.ar || data.country || 'الجزائر';
        return {
            lat, lon, name, state, country,
            displayName: this._buildDisplayName(name, state, country)
        };
    },

    _parseNominatim(data, lat, lon) {
        const addr = data.address || {};
        // نستخرج الاسم العربي بدقة: قرية/مدينة/بلدة
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || 'موقع غير معروف';
        const state = addr.state || addr.county || addr.district || addr.region || '';
        const country = addr.country || 'الجزائر';
        return {
            lat, lon, name: city, state, country,
            displayName: this._buildDisplayName(city, state, country)
        };
    },

    _buildDisplayName(city, state, country) {
        const parts = [city];
        if (state && state !== city && state !== country) parts.push(state);
        if (country) parts.push(country);
        return parts.join(' / ');
    },

    _fallback(lat, lon) {
        return {
            lat, lon, name: 'الموقع الحالي', state: '', country: 'الجزائر',
            displayName: 'الموقع الحالي / الجزائر'
        };
    },

    async searchCities(query) {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase();
        const local = ALGERIAN_CITIES.filter(c => c.name.toLowerCase().includes(q));
        if (local.length > 0) return local.map(c => ({
            ...c, displayName: this._buildDisplayName(c.name, c.state, 'الجزائر')
        }));
        return this._searchNominatim(query);
    },

    async _searchNominatim(query) {
        try {
            const url = `${CONFIG.NOMINATIM_URL}/search?format=json&addressdetails=1&limit=8&accept-language=ar&q=${encodeURIComponent(query + ', Algeria')}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'meteo-dz/2.0' } });
            const data = await res.json();
            return data.map(p => {
                const addr = p.address || {};
                const name = p.display_name.split(',')[0];
                return {
                    lat: parseFloat(p.lat), lon: parseFloat(p.lon),
                    name, state: addr.state || addr.county || '',
                    country: addr.country || 'الجزائر',
                    displayName: p.display_name
                };
            });
        } catch (e) { return []; }
    }
};

// ============================================
// 5. ALGERIAN CITIES DB
// ============================================
const ALGERIAN_CITIES = [
    { name: "الجزائر العاصمة", lat: 36.752887, lon: 3.042048, state: "الجزائر العاصمة" },
    { name: "وهران", lat: 35.697654, lon: -0.633737, state: "وهران" },
    { name: "قسنطينة", lat: 36.365, lon: 6.614722, state: "قسنطينة" },
    { name: "عنابة", lat: 36.9, lon: 7.766667, state: "عنابة" },
    { name: "البليدة", lat: 36.483333, lon: 2.833333, state: "البليدة" },
    { name: "سطيف", lat: 36.191944, lon: 5.413611, state: "سطيف" },
    { name: "تيزي وزو", lat: 36.716667, lon: 4.05, state: "تيزي وزو" },
    { name: "باتنة", lat: 35.55, lon: 6.166667, state: "باتنة" },
    { name: "الشلف", lat: 36.166667, lon: 1.333333, state: "الشلف" },
    { name: "تلمسان", lat: 34.882778, lon: -1.316667, state: "تلمسان" },
    { name: "بجاية", lat: 36.75, lon: 5.083333, state: "بجاية" },
    { name: "بشار", lat: 31.616667, lon: -2.216667, state: "بشار" },
    { name: "ورقلة", lat: 31.95, lon: 5.316667, state: "ورقلة" },
    { name: "تمنراست", lat: 22.785, lon: 5.522778, state: "تمنراست" },
    { name: "سعيدة", lat: 34.8303, lon: 0.1517, state: "سعيدة" },
    { name: "سكيكدة", lat: 36.8667, lon: 6.9, state: "سكيكدة" },
    { name: "المدية", lat: 36.2667, lon: 2.75, state: "المدية" },
    { name: "تيارت", lat: 35.3711, lon: 1.316, state: "تيارت" },
    { name: "الجلفة", lat: 34.6728, lon: 3.2636, state: "الجلفة" },
    { name: "قالمة", lat: 36.4621, lon: 7.4251, state: "قالمة" },
    { name: "بومرداس", lat: 36.7667, lon: 3.4778, state: "بومرداس" },
    { name: "دلس", lat: 36.9167, lon: 3.9167, state: "بومرداس" },
    { name: "البويرة", lat: 36.3667, lon: 3.9, state: "البويرة" },
    { name: "تيبازة", lat: 36.6, lon: 2.4333, state: "تيبازة" },
    { name: "عين الدفلى", lat: 36.2667, lon: 1.9667, state: "عين الدفلى" },
    { name: "مستغانم", lat: 35.9333, lon: 0.0833, state: "مستغانم" },
    { name: "غليزان", lat: 35.7333, lon: 0.55, state: "غليزان" },
    { name: "الأغواط", lat: 33.8, lon: 2.8833, state: "الأغواط" },
    { name: "غرداية", lat: 32.4833, lon: 3.6667, state: "غرداية" },
    { name: "تندوف", lat: 27.6667, lon: -8.1667, state: "تندوف" },
    { name: "إليزي", lat: 26.5, lon: 8.4667, state: "إليزي" },
    { name: "أدرار", lat: 27.8667, lon: -0.2833, state: "أدرار" },
    { name: "تيسمسيلت", lat: 35.6, lon: 1.8167, state: "تيسمسيلت" },
    { name: "سيدي بلعباس", lat: 35.2, lon: -0.6333, state: "سيدي بلعباس" },
    { name: "سوق أهراس", lat: 36.2833, lon: 7.95, state: "سوق أهراس" },
    { name: "خنشلة", lat: 35.4167, lon: 7.1333, state: "خنشلة" },
    { name: "ميلة", lat: 36.45, lon: 6.2667, state: "ميلة" },
    { name: "عين تيموشنت", lat: 35.3, lon: -1.1333, state: "عين تيموشنت" },
    { name: "برج بوعريريج", lat: 36.0667, lon: 4.7667, state: "برج بوعريريج" },
    { name: "المسيلة", lat: 35.7167, lon: 4.5333, state: "المسيلة" },
    { name: "الوادي", lat: 33.35, lon: 6.8667, state: "الوادي" },
    { name: "خميس مليانة", lat: 36.2667, lon: 2.6833, state: "عين الدفلى" },
    { name: "القليعة", lat: 36.7667, lon: 2.95, state: "تيبازة" },
    { name: "الرويبة", lat: 36.7333, lon: 3.2833, state: "الجزائر العاصمة" },
    { name: "زرالدة", lat: 36.7167, lon: 2.85, state: "الجزائر العاصمة" },
    { name: "الحراش", lat: 36.7167, lon: 3.1333, state: "الجزائر العاصمة" },
    { name: "باب الزوار", lat: 36.7333, lon: 3.1833, state: "الجزائر العاصمة" },
    { name: "بوزريعة", lat: 36.7833, lon: 3.0167, state: "الجزائر العاصمة" },
    { name: "الدار البيضاء", lat: 36.7333, lon: 3.1167, state: "الجزائر العاصمة" }
];

// ============================================
// 6. WEATHER SERVICE
// ============================================
const WeatherService = {
    async fetchCurrent(lat, lon) {
        const url = `${CONFIG.API_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}&lang=ar`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('فشل جلب بيانات الطقس الحالية');
        return res.json();
    },

    async fetchForecast(lat, lon) {
        const url = `${CONFIG.API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}&lang=ar`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('فشل جلب التنبؤات');
        return res.json();
    },

    async fetchAtPoint(lat, lon) {
        const url = `${CONFIG.API_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}&lang=ar`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('فشل جلب بيانات النقطة');
        return res.json();
    },

    getIcon(id, isDay = true) {
        const map = {
            thunder: { icon: 'fas fa-bolt', color: '#8e44ad' },
            drizzle: { icon: 'fas fa-cloud-rain', color: '#3498db' },
            rain: { icon: 'fas fa-cloud-showers-heavy', color: '#2980b9' },
            snow: { icon: 'fas fa-snowflake', color: '#60a5fa' },
            fog: { icon: 'fas fa-smog', color: '#94a3b8' },
            clear: { icon: isDay ? 'fas fa-sun' : 'fas fa-moon', color: isDay ? '#f1c40f' : '#64748b' },
            clouds: { icon: 'fas fa-cloud', color: '#94a3b8' }
        };
        if (id >= 200 && id < 300) return map.thunder;
        if (id >= 300 && id < 500) return map.drizzle;
        if (id >= 500 && id < 600) return map.rain;
        if (id >= 600 && id < 700) return map.snow;
        if (id >= 700 && id < 800) return map.fog;
        if (id === 800) return map.clear;
        if (id > 800) return map.clouds;
        return map.clear;
    },

    windDir(deg) {
        const dirs = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
        return dirs[Math.round((deg % 360) / 45) % 8];
    },

    waveHeight(windSpeed) { return (windSpeed * 0.2).toFixed(1); },
    wavePeriod(windSpeed) { return (windSpeed * 0.3).toFixed(1); },
    formatTime(d) { return d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }); }
};

// ============================================
// 7. UI UPDATER
// ============================================
const UI = {
    els: {},
    init() {
        const ids = [
            'alertBanner', 'alertText', 'closeAlert', 'siteHeader', 'mobileMenuBtn', 'mainNav',
            'searchInput', 'citySuggestions', 'locationBtn', 'currentCity', 'currentCountry',
            'updateTime', 'currentTemp', 'currentCondition', 'weatherIcon', 'weatherDetails',
            'hourlyForecast', 'forecastContainer', 'weatherMap', 'temperatureChart',
            'statsGrid', 'newsGrid', 'apiStatus', 'scrollTop', 'refreshWeather', 'refreshNews',
            'weatherTips', 'waveHeight', 'waveDirection', 'wavePeriod', 'seaTipsList',
            'cubeTemp1', 'cubeTemp2', 'cubeTemp3', 'cubeTemp4', 'cubeTemp5', 'cubeTemp6',
            'statMaxTemp', 'statMinTemp', 'statRain', 'statWind'
        ];
        ids.forEach(id => { this.els[id] = document.getElementById(id); });
    },

    updateCurrentWeather(data, location) {
        if (!location) return;
        const locName = location.displayName || location.name;

        if (this.els.currentCity) this.els.currentCity.textContent = locName;
        if (this.els.currentCountry) this.els.currentCountry.textContent = location.country || 'الجزائر';
        if (this.els.currentTemp) this.els.currentTemp.textContent = `${Math.round(data.main.temp)}°`;
        if (this.els.currentCondition) {
            this.els.currentCondition.textContent = `${data.weather[0]?.description || ''} - ${location.name}`;
        }

        const isDay = data.weather[0]?.icon?.includes('d') ?? true;
        const wInfo = WeatherService.getIcon(data.weather[0]?.id, isDay);
        if (this.els.weatherIcon) {
            this.els.weatherIcon.innerHTML = `<i class="${wInfo.icon}"></i>`;
            this.els.weatherIcon.style.color = wInfo.color;
        }

        const details = [
            { icon: 'fas fa-temperature-high', label: 'الإحساس', value: `${Math.round(data.main.feels_like)}°C` },
            { icon: 'fas fa-tint', label: 'الرطوبة', value: `${data.main.humidity}%` },
            { icon: 'fas fa-wind', label: 'الرياح', value: `${Math.round(data.wind.speed * 3.6)} كم/س` },
            { icon: 'fas fa-compress-alt', label: 'الضغط', value: `${data.main.pressure} hPa` },
            { icon: 'fas fa-eye', label: 'الرؤية', value: `${(data.visibility / 1000).toFixed(1)} كم` },
            { icon: 'fas fa-cloud', label: 'السحب', value: `${data.clouds?.all || 0}%` },
            { icon: 'fas fa-location-arrow', label: 'اتجاه الرياح', value: WeatherService.windDir(data.wind.deg || 0) },
            { icon: 'fas fa-sun', label: 'UV', value: data.uvi || '--' }
        ];

        if (this.els.weatherDetails) {
            this.els.weatherDetails.innerHTML = details.map(d => `
                <div class="detail-card">
                    <div class="detail-card-icon"><i class="${d.icon}"></i></div>
                    <div class="detail-card-value">${d.value}</div>
                    <div class="detail-card-label">${d.label}</div>
                </div>
            `).join('');
        }
        this._updateCubes(data.main.temp);
    },

    _updateCubes(temp) {
        const temps = [temp, temp - 2, temp + 1, temp - 1, temp + 8, temp - 3];
        temps.forEach((t, i) => {
            const el = this.els[`cubeTemp${i + 1}`];
            if (el) el.textContent = `${Math.round(t)}°`;
        });
    },

    updateHourly(data) {
        const hourly = data.list.slice(0, 8);
        if (this.els.hourlyForecast) {
            this.els.hourlyForecast.innerHTML = hourly.map(item => {
                const date = new Date(item.dt * 1000);
                const hour = date.getHours();
                const isDay = hour >= 6 && hour < 18;
                const info = WeatherService.getIcon(item.weather[0]?.id, isDay);
                return `
                    <div class="hourly-card">
                        <div class="hourly-time">${hour}:00</div>
                        <div class="hourly-icon"><i class="${info.icon}" style="color:${info.color}"></i></div>
                        <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
                        <div class="hourly-desc">${item.weather[0]?.description || ''}</div>
                    </div>
                `;
            }).join('');
        }
    },

    updateDaily(data) {
        const daily = {};
        const days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
        data.list.forEach(item => {
            const d = new Date(item.dt * 1000);
            const key = d.toDateString();
            if (!daily[key]) daily[key] = { temps: [], ids: [], descs: [], dayName: days[d.getDay()], dateStr: `${d.getDate()}/${d.getMonth()+1}` };
            daily[key].temps.push(item.main.temp);
            daily[key].ids.push(item.weather[0]?.id || 800);
            daily[key].descs.push(item.weather[0]?.description || '');
        });

        const entries = Object.values(daily).slice(0, 7);
        if (this.els.forecastContainer) {
            this.els.forecastContainer.innerHTML = entries.map(day => {
                const max = Math.max(...day.temps);
                const min = Math.min(...day.temps);
                const avgId = day.ids[Math.floor(day.ids.length / 2)];
                const info = WeatherService.getIcon(avgId);
                const desc = day.descs[Math.floor(day.descs.length / 2)] || '';
                return `
                    <div class="forecast-card">
                        <div class="forecast-day">${day.dayName}</div>
                        <div class="forecast-date">${day.dateStr}</div>
                        <div class="forecast-icon"><i class="${info.icon}" style="color:${info.color}"></i></div>
                        <div class="forecast-condition">${desc}</div>
                        <div class="forecast-temps">
                            <span class="forecast-high">${Math.round(max)}°</span>
                            <span class="forecast-low">${Math.round(min)}°</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    updateSea(data) {
        const wh = WeatherService.waveHeight(data.wind.speed);
        const wp = WeatherService.wavePeriod(data.wind.speed);
        const wd = WeatherService.windDir(data.wind.deg || 0);
        if (this.els.waveHeight) this.els.waveHeight.textContent = wh;
        if (this.els.waveDirection) this.els.waveDirection.textContent = wd;
        if (this.els.wavePeriod) this.els.wavePeriod.textContent = wp;

        const h = parseFloat(wh);
        let tips = [];
        if (h < 0.5) tips = ['<i class="fas fa-check"></i> البحر هادئ - مثالي للسباحة', '<i class="fas fa-check"></i> مناسب لجميع الأنشطة البحرية', '<i class="fas fa-check"></i> حالة ممتازة للصيد', '<i class="fas fa-check"></i> آمن للقوارب الصغيرة'];
        else if (h < 1.5) tips = ['<i class="fas fa-check"></i> البحر هادئ إلى متوسط', '<i class="fas fa-check"></i> مناسب لمعظم الأنشطة', '<i class="fas fa-exclamation-triangle"></i> احترس من التيارات', '<i class="fas fa-check"></i> راقب الأطفال أثناء السباحة'];
        else if (h < 2.5) tips = ['<i class="fas fa-exclamation-triangle"></i> بحر مضطرب - احذر', '<i class="fas fa-times"></i> تجنب السباحة', '<i class="fas fa-times"></i> غير مناسب للقوارب الصغيرة', '<i class="fas fa-check"></i> ارتدِ سترة النجاة'];
        else tips = ['<i class="fas fa-times"></i> بحر عالي الموج - خطر', '<i class="fas fa-times"></i> تجنب الأنشطة البحرية تماماً', '<i class="fas fa-times"></i> لا تخرج بالقوارب', '<i class="fas fa-exclamation-triangle"></i> انتظر حتى تهدأ الأمواج'];

        if (this.els.seaTipsList) this.els.seaTipsList.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
    },

    updateStats(current, forecast) {
        const temps = forecast.list.map(i => i.main.temp);
        const max = Math.max(...temps);
        const min = Math.min(...temps);
        const rain = forecast.list.filter(i => i.weather[0]?.id >= 500 && i.weather[0]?.id < 600).length * 2.5;
        const avgWind = forecast.list.reduce((s, i) => s + i.wind.speed, 0) / forecast.list.length;

        if (this.els.statMaxTemp) this.els.statMaxTemp.textContent = `${Math.round(max)}°`;
        if (this.els.statMinTemp) this.els.statMinTemp.textContent = `${Math.round(min)}°`;
        if (this.els.statRain) this.els.statRain.textContent = `${rain.toFixed(1)}mm`;
        if (this.els.statWind) this.els.statWind.textContent = `${Math.round(avgWind * 3.6)}km/h`;
    },

    updateTips(data) {
        const temp = data.main.temp;
        const id = data.weather[0]?.id || 800;
        const wind = (data.wind.speed || 0) * 3.6;
        const tips = [];

        if (temp > 35) tips.push({ icon: 'fas fa-temperature-high', title: 'موجة حرارة شديدة', text: 'تجنب التعرض للشمس بين 11 صباحاً و4 مساءً. اشرب الماء باستمرار.', severity: 'high' });
        if (temp > 28) tips.push({ icon: 'fas fa-tint', title: 'ترطيب الجسم', text: 'اشرب 8-10 أكواب من الماء يومياً. تجنب الكافيين.', severity: 'medium' });
        if (temp < 10) tips.push({ icon: 'fas fa-snowflake', title: 'موجة برد', text: 'ارتدِ طبقات ملابس دافئة. احمِ يديك ورأسك.', severity: 'high' });
        if (id >= 500 && id < 600) tips.push({ icon: 'fas fa-umbrella', title: 'توقعات أمطار', text: 'احمل مظلة وارتدِ ملابس مقاومة للماء.', severity: 'medium' });
        if (wind > 50) tips.push({ icon: 'fas fa-wind', title: 'رياح قوية', text: 'ثبت الأشياء في الخارج. تجنب الوقوف تحت الأشجار.', severity: 'high' });
        if (id >= 200 && id < 300) tips.push({ icon: 'fas fa-bolt', title: 'عواصف رعدية', text: 'ابقَ في الداخل. تجنب الأجهزة الكهربائية.', severity: 'high' });
        if (!tips.length) tips.push({ icon: 'fas fa-sun', title: 'طقس معتدل', text: 'الأحوال الجوية مستقرة. فرصة ممتازة للأنشطة الخارجية.', severity: 'low' });

        if (this.els.weatherTips) {
            this.els.weatherTips.innerHTML = tips.slice(0, 3).map(t => `
                <div class="tip-card">
                    <div class="tip-icon"><i class="${t.icon}"></i></div>
                    <h3 class="tip-title">${t.title}</h3>
                    <p class="tip-text">${t.text}</p>
                    <span class="tip-severity ${t.severity}">${t.severity === 'high' ? 'تحذير عالي' : t.severity === 'medium' ? 'تنبيه متوسط' : 'نصيحة عامة'}</span>
                </div>
            `).join('');
        }
    },

    updateChart(forecast) {
        const ctx = this.els.temperatureChart?.getContext('2d');
        if (!ctx) return;

        const labels = [];
        const maxTemps = [];
        const minTemps = [];
        const daily = {};

        forecast.list.forEach(item => {
            const d = new Date(item.dt * 1000);
            const ds = d.toLocaleDateString('ar-DZ', { weekday: 'short' });
            if (!daily[ds]) daily[ds] = [];
            daily[ds].push(item.main.temp);
        });

        let c = 0;
        for (const [day, temps] of Object.entries(daily)) {
            if (c >= 7) break;
            labels.push(day);
            maxTemps.push(Math.round(Math.max(...temps)));
            minTemps.push(Math.round(Math.min(...temps)));
            c++;
        }

        if (AppState.temperatureChart) AppState.temperatureChart.destroy();
        AppState.temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'العليا', data: maxTemps, borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#e74c3c', pointBorderColor: '#fff', pointBorderWidth: 2 },
                    { label: 'الدنيا', data: minTemps, borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#3498db', pointBorderColor: '#fff', pointBorderWidth: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#a09888', font: { family: 'Cairo', size: 14 } } },
                    tooltip: { backgroundColor: 'rgba(10,14,26,0.9)', titleColor: '#d4a853', bodyColor: '#e8e0d0', borderColor: 'rgba(212,168,83,0.2)', borderWidth: 1, callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}°C` } }
                },
                scales: {
                    y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#6b6560', callback: v => v + '°C', font: { family: 'Cairo' } } },
                    x: { grid: { display: false }, ticks: { color: '#6b6560', font: { family: 'Cairo' } } }
                }
            }
        });
    },

    setApiStatus(ok) {
        const s = this.els.apiStatus;
        if (!s) return;
        if (ok) {
            s.innerHTML = '<i class="fas fa-check-circle"></i><span>متصل</span>';
            s.classList.remove('error');
        } else {
            s.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>خطأ في الاتصال</span>';
            s.classList.add('error');
        }
    },

    setLoading(isLoading) {
        const btn = this.els.refreshWeather;
        if (btn) {
            btn.disabled = isLoading;
            btn.innerHTML = isLoading ? '<span class="spinner"></span> جاري التحديث...' : '<i class="fas fa-sync-alt"></i> تحديث البيانات';
        }
        AppState.isLoading = isLoading;
    },

    setLocLoading(isLoading) {
        const btn = this.els.locationBtn;
        if (btn) btn.innerHTML = isLoading ? '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>' : '<i class="fas fa-location-crosshairs"></i>';
    },

    updateTime() {
        if (this.els.updateTime) this.els.updateTime.textContent = WeatherService.formatTime(new Date());
    }
};

// ============================================
// 8. MAP SERVICE
// ============================================
const MapService = {
    map: null, marker: null,

    init() {
        const loc = AppState.currentLocation || CONFIG.DEFAULT_LOCATION;
        this.map = L.map('weatherMap').setView([loc.lat, loc.lon], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap', maxZoom: 18
        }).addTo(this.map);

        this._updateLayer();
        this._setMarker(loc.lat, loc.lon, loc.displayName || loc.name);

        this.map.on('click', e => this._handleClick(e));
        window.addEventListener('resize', () => setTimeout(() => this.map?.invalidateSize(), 200));
    },

    _updateLayer() {
        const urls = {
            temperature: `${CONFIG.TILE_URL}/temp_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`,
            precipitation: `${CONFIG.TILE_URL}/precipitation_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`,
            wind: `${CONFIG.TILE_URL}/wind_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`,
            clouds: `${CONFIG.TILE_URL}/clouds_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`
        };
        const key = AppState.currentLayer;

        if (!AppState.tileLayers[key]) {
            AppState.tileLayers[key] = L.tileLayer(urls[key], { opacity: 0.6, maxZoom: 18, attribution: '© OpenWeatherMap' });
        }

        Object.values(AppState.tileLayers).forEach(l => { if (this.map.hasLayer(l)) this.map.removeLayer(l); });
        AppState.tileLayers[key].addTo(this.map);
        this._updateLegend();
    },

    _updateLegend() {
        const legend = document.getElementById('mapLegend');
        if (!legend) return;
        const legends = {
            temperature: { title: 'درجة الحرارة (°C)', gradient: 'linear-gradient(to right, #0000FF, #00BFFF, #00FF7F, #FFD700, #FF4500)', labels: ['≤0°','10°','20°','30°','>30°'] },
            precipitation: { title: 'هطول الأمطار (مم)', gradient: 'linear-gradient(to right, #FFFFFF, #ADD8E6, #1E90FF, #0000FF)', labels: ['0','5','20','≥20'] },
            wind: { title: 'سرعة الرياح (كم/س)', gradient: 'linear-gradient(to right, #00FF00, #FFFF00, #FFA500, #FF0000)', labels: ['0-10','20','40','≥50'] },
            clouds: { title: 'الغطاء السحابي (%)', gradient: 'linear-gradient(to right, #FFFFFF, #CCCCCC, #888888, #555555)', labels: ['0%','25%','50%','75%','100%'] }
        };
        const l = legends[AppState.currentLayer];
        legend.innerHTML = `<h4>${l.title}</h4><div class="legend-gradient" style="background:${l.gradient};"></div><div class="legend-labels">${l.labels.map(x => `<span>${x}</span>`).join('')}</div>`;
    },

    _setMarker(lat, lon, title) {
        if (this.marker) this.map.removeLayer(this.marker);
        this.marker = L.marker([lat, lon]).addTo(this.map)
            .bindPopup(`<b style="font-family:Cairo;">${title}</b>`)
            .openPopup();
    },

    async _handleClick(e) {
        const { lat, lng: lon } = e.latlng;
        L.popup().setLatLng([lat, lon]).setContent('<div style="direction:rtl;font-family:Cairo;text-align:center;"><i class="fas fa-spinner fa-spin"></i> جارٍ التحميل...</div>').openOn(this.map);

        try {
            const [weather, geo] = await Promise.all([
                WeatherService.fetchAtPoint(lat, lon),
                GeoService.reverseGeocode(lat, lon).catch(() => GeoService._fallback(lat, lon))
            ]);

            const isDay = weather.weather[0]?.icon?.includes('d') ?? true;
            const info = WeatherService.getIcon(weather.weather[0]?.id, isDay);

            L.popup().setLatLng([lat, lon]).setContent(`
                <div style="direction:rtl;text-align:right;font-family:Cairo;min-width:220px;">
                    <h3 style="margin-bottom:8px;color:#d4a853;font-size:1.1rem;"><i class="fas fa-map-marker-alt"></i> ${geo.displayName}</h3>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                        <i class="${info.icon}" style="font-size:2rem;color:${info.color}"></i>
                        <div>
                            <div style="font-size:1.5rem;font-weight:800;color:#e8e0d0;">${Math.round(weather.main.temp)}°C</div>
                            <div style="color:#a09888;font-size:0.9rem;">${weather.weather[0]?.description || ''}</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem;color:#a09888;">
                        <div><i class="fas fa-tint" style="color:#3498db"></i> ${weather.main.humidity}%</div>
                        <div><i class="fas fa-wind" style="color:#94a3b8"></i> ${Math.round(weather.wind.speed * 3.6)} كم/س</div>
                        <div><i class="fas fa-compress-alt" style="color:#94a3b8"></i> ${weather.main.pressure} hPa</div>
                        <div><i class="fas fa-eye" style="color:#94a3b8"></i> ${(weather.visibility / 1000).toFixed(1)} كم</div>
                    </div>
                    <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.75rem;color:#6b6560;">
                        <i class="fas fa-location-arrow"></i> ${lat.toFixed(4)}, ${lon.toFixed(4)}
                    </div>
                </div>
            `).openOn(this.map);
        } catch (err) {
            L.popup().setLatLng([lat, lon]).setContent('<div style="direction:rtl;font-family:Cairo;color:#e74c3c;">تعذر جلب البيانات</div>').openOn(this.map);
        }
    },

    setLayer(layer) {
        AppState.currentLayer = layer;
        this._updateLayer();
    },

    setView(lat, lon, zoom = 10) {
        this.map?.setView([lat, lon], zoom);
    },

    updateMarker(lat, lon, title) {
        this._setMarker(lat, lon, title);
    }
};

// ============================================
// 9. SEARCH SERVICE
// ============================================
const SearchService = {
    input: null, suggestions: null, timer: null,
    init() {
        this.input = document.getElementById('searchInput');
        this.suggestions = document.getElementById('citySuggestions');
        if (!this.input || !this.suggestions) return;

        this.input.addEventListener('input', e => this._onInput(e));
        this.input.addEventListener('focus', () => { if (this.input.value.length >= 2) this._onInput({ target: this.input }); });
        this.suggestions.addEventListener('click', e => {
            const item = e.target.closest('.city-suggestion-item');
            if (item) this._select(item.dataset);
        });
        document.addEventListener('click', e => { if (!e.target.closest('.search-wrapper')) this._hide(); });
    },

    _onInput(e) {
        const q = e.target.value.trim();
        if (q.length < 2) { this._hide(); return; }
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this._search(q), 300);
    },

    async _search(q) {
        const results = await GeoService.searchCities(q);
        this._render(results);
    },

    _render(list) {
        if (!list?.length) { this._hide(); return; }
        this.suggestions.innerHTML = list.slice(0, 8).map(c => `
            <div class="city-suggestion-item" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}" data-display="${c.displayName || c.name}">
                <div class="city-name">${c.name}</div>
                <div class="city-region">${c.state ? c.state + ' - ' : ''}${c.country || 'الجزائر'}</div>
            </div>
        `).join('');
        this.suggestions.classList.add('visible');
    },

    _hide() { this.suggestions?.classList.remove('visible'); },

    _select(ds) {
        const loc = {
            lat: parseFloat(ds.lat), lon: parseFloat(ds.lon),
            name: ds.name, displayName: ds.display || ds.name
        };
        this.input.value = ds.name;
        this._hide();
        App.setLocation(loc);
    }
};

// ============================================
// 10. NEWS SERVICE
// ============================================
const NewsService = {
    async fetch() {
        return [
            { title: 'تحذير من موجة حر في الجنوب الجزائري', excerpt: 'تتوقع مصالح الأرصاد الجوية موجة حر شديدة في ولايات الجنوب الأسبوع المقبل مع درجات حرارة تتجاوز 45 درجة مئوية.', category: 'alert', time: 'منذ 2 ساعة', image: 'https://images.unsplash.com/photo-1504370805625-d32c54b16100?w=600' },
            { title: 'تحسن في الأحوال الجوية بالشمال', excerpt: 'من المتوقع تحسن الأحوال الجوية بداية من يوم الغد مع انخفاض في درجات الحرارة وهبوب رياح معتدلة.', category: 'weather', time: 'منذ 4 ساعات', image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=600' },
            { title: 'دراسة: تغير المناخ يؤثر على الأمطار في الجزائر', excerpt: 'أظهرت دراسة حديثة تراجعاً في كميات الأمطار السنوية بنسبة 15% خلال العقد الماضي.', category: 'climate', time: 'منذ 6 ساعات', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS78siJJZBgrkcehidIRlOHE08bBqUZFvVAH3Dm57PqSe7MuvwdnQ8msxM&s=10' }
        ];
    },
    render(data) {
        const c = document.getElementById('newsGrid');
        if (!c) return;
        c.innerHTML = data.map(n => `
            <div class="news-card">
                <div class="news-image"><img src="${n.image}" alt="${n.title}" loading="lazy"></div>
                <div class="news-content">
                    <span class="news-category ${n.category}">${n.category === 'alert' ? 'تحذير' : n.category === 'weather' ? 'طقس' : 'مناخ'}</span>
                    <h3 class="news-title">${n.title}</h3>
                    <p class="news-excerpt">${n.excerpt}</p>
                    <div class="news-meta"><span><i class="fas fa-clock"></i> ${n.time}</span></div>
                </div>
            </div>
        `).join('');
    }
};

// ============================================
// 11. STAR BACKGROUND
// ============================================
function initStarField() {
    const canvas = document.getElementById('starCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars = [], mouse = { x: null, y: null };
    const N = 200, D = 100;

    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    function create() { stars.length = 0; for (let i = 0; i < N; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.5, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, a: Math.random() * 0.5 + 0.3 }); }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(212,168,83,0.08)'; ctx.lineWidth = 0.5;
        for (let i = 0; i < stars.length; i++) {
            for (let j = i + 1; j < stars.length; j++) {
                const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < D) { ctx.globalAlpha = (1 - dist / D) * 0.3; ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y); ctx.stroke(); }
            }
        }
        ctx.globalAlpha = 1;
        for (const s of stars) {
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(212,168,83,${s.a})`; ctx.fill();
            if (mouse.x !== null) { const dx = mouse.x - s.x, dy = mouse.y - s.y; if (Math.sqrt(dx * dx + dy * dy) < 150) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(212,168,83,${s.a * 0.5})`; ctx.fill(); } }
            s.x += s.vx; s.y += s.vy;
            if (s.x < 0) s.x = w; if (s.x > w) s.x = 0; if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
            s.a += (Math.random() - 0.5) * 0.02; s.a = Math.max(0.2, Math.min(0.8, s.a));
        }
        requestAnimationFrame(draw);
    }
    canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    canvas.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });
    window.addEventListener('resize', () => { resize(); create(); });
    resize(); create(); draw();
}

// ============================================
// 12. APP CONTROLLER
// ============================================
const App = {
    refreshTimer: null,

    async init() {
        console.log('%c[Algeria Weather Pro] Starting...', 'color:#d4a853; font-size:14px; font-weight:bold;');
        Notify.init();
        UI.init();
        SearchService.init();
        AppState.init();

        // أولاً: تحميل الخريطة
        MapService.init();

        // ثانياً: طلب الموقع (GPS إذا لم يوجد cache)
        await this._checkLocation();

        // ثالثاً: تحميل البيانات
        await this.loadWeather();
        await this.loadNews();

        // رابعاً: التحديث التلقائي والأحداث
        this._setupAutoRefresh();
        this._setupEvents();
        initStarField();

        // GSAP animations
        if (window.gsap) {
            gsap.registerPlugin(ScrollTrigger);
            gsap.utils.toArray('.weather-card, .forecast-card, .stat-card, .tip-card').forEach(el => {
                gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%' }, y: 30, opacity: 0, duration: 0.6, ease: 'power2.out' });
            });
        }
    },

    async _checkLocation() {
        const cached = LocationCache.get();
        if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION)) {
            AppState.currentLocation = cached.data;
            Notify.success(`مرحباً بك في ${cached.data.displayName || cached.data.name}`);
            return;
        }
        // لا يوجد cache صالح: نطلب GPS
        await this.updateFromGPS();
    },

    async updateFromGPS() {
        UI.setLocLoading(true);
        try {
            const pos = await GeoService.requestGPS();
            const { latitude: lat, longitude: lon } = pos.coords;
            const loc = await GeoService.reverseGeocode(lat, lon);
            AppState.setLocation(loc);
            Notify.success(`تم تحديد موقعك: ${loc.displayName}`);
            MapService.setView(lat, lon, 10);
            MapService.updateMarker(lat, lon, loc.displayName);
        } catch (err) {
            console.error('[App] GPS error:', err);
            Notify.error(err.message);
            // Fallback
            AppState.setLocation({ ...CONFIG.DEFAULT_LOCATION });
            Notify.warning('تم استخدام الموقع الافتراضي: الجزائر العاصمة');
        } finally {
            UI.setLocLoading(false);
            Notify.hide();
        }
    },

    async loadWeather() {
        if (AppState.isLoading) return;
        UI.setLoading(true);
        Notify.loading('جارٍ تحميل بيانات الطقس...');

        try {
            const loc = AppState.currentLocation;
            const [current, forecast] = await Promise.all([
                WeatherService.fetchCurrent(loc.lat, loc.lon),
                WeatherService.fetchForecast(loc.lat, loc.lon)
            ]);

            AppState.setWeather(current);
            AppState.forecastData = forecast;

            UI.updateCurrentWeather(current, loc);
            UI.updateHourly(forecast);
            UI.updateDaily(forecast);
            UI.updateSea(current);
            UI.updateStats(current, forecast);
            UI.updateTips(current);
            UI.updateChart(forecast);
            UI.updateTime();
            UI.setApiStatus(true);

            MapService.updateMarker(loc.lat, loc.lon, loc.displayName || loc.name);
            Notify.success('تم تحديث بيانات الطقس بنجاح');

        } catch (err) {
            console.error('[App] Weather error:', err);
            Notify.error(`خطأ في جلب البيانات: ${err.message}`);
            UI.setApiStatus(false);

            // Fallback: إذا كان الموقع الحالي ليس الافتراضي، نحاول بالافتراضي
            if (AppState.currentLocation.name !== CONFIG.DEFAULT_LOCATION.name) {
                Notify.warning('جارٍ المحاولة بالموقع الافتراضي...');
                AppState.setLocation({ ...CONFIG.DEFAULT_LOCATION });
                await this.loadWeather();
            }
        } finally {
            UI.setLoading(false);
            Notify.hide();
        }
    },

    async loadNews() {
        try {
            const data = await NewsService.fetch();
            NewsService.render(data);
        } catch (e) { console.error('[App] News error:', e); }
    },

    setLocation(loc) {
        AppState.setLocation(loc);
        this.loadWeather();
        MapService.setView(loc.lat, loc.lon, 10);
        MapService.updateMarker(loc.lat, loc.lon, loc.displayName || loc.name);
    },

    _setupAutoRefresh() {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.loadWeather(), CONFIG.REFRESH_INTERVAL);
        console.log(`[App] Auto-refresh every ${CONFIG.REFRESH_INTERVAL / 60000} min`);
    },

    _setupEvents() {
        // تحديث الطقس
        document.getElementById('refreshWeather')?.addEventListener('click', () => this.loadWeather());

        // تحديث الموقع
        document.getElementById('locationBtn')?.addEventListener('click', () => this.updateFromGPS());

        // تحديث الأخبار
        document.getElementById('refreshNews')?.addEventListener('click', () => this.loadNews());

        // قائمة الجوال
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            document.getElementById('mainNav')?.classList.toggle('active');
        });

        // طبقات الخريطة
        document.querySelectorAll('.map-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                MapService.setLayer(this.dataset.layer);
            });
        });

        // تبويبات الإحصائيات
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                Notify.success(`تم تغيير الفترة إلى: ${this.textContent}`);
            });
        });

        // روابط المدن في الفوتر
        document.querySelectorAll('[data-city]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const nameMap = { "Algiers": "الجزائر العاصمة", "Oran": "وهران", "Constantine": "قسنطينة", "Annaba": "عنابة", "Blida": "البليدة", "Setif": "سطيف" };
                const cityName = nameMap[e.target.closest('[data-city]').dataset.city];
                const city = ALGERIAN_CITIES.find(c => c.name === cityName);
                if (city) {
                    this.setLocation({
                        lat: city.lat, lon: city.lon, name: city.name, state: city.state, country: 'الجزائر',
                        displayName: GeoService._buildDisplayName(city.name, city.state, 'الجزائر')
                    });
                }
            });
        });

        // تنقل سلس
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href?.startsWith('#')) {
                    e.preventDefault();
                    const target = document.getElementById(href.substring(1));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                        this.classList.add('active');
                        document.getElementById('mainNav')?.classList.remove('active');
                    }
                }
            });
        });

        // زر العودة للأعلى
        document.getElementById('scrollTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        // إخفاء/إظهار الهيدر
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const cur = window.pageYOffset;
            const header = document.getElementById('siteHeader');
            const topBtn = document.getElementById('scrollTop');
            if (header) {
                if (cur > lastScroll && cur > 100) header.classList.add('hidden');
                else header.classList.remove('hidden');
                header.classList.toggle('scrolled', cur > 50);
            }
            if (topBtn) topBtn.classList.toggle('visible', cur > 300);
            lastScroll = cur;
        });
    }
};

// ============================================
// 13. BOOT
// ============================================
document.addEventListener('DOMContentLoaded', () => App.init());