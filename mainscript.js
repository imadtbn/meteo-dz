// ═══════════════════════════════════════════════════════════════

//  الطقس الجزائري - Algeria Weather Pro
//  إعادة بناء احترافية للكود JavaScript
//  التاريخ: 2026-06-19
// ═══════════════════════════════════════════════════════════════

// ============================================
// 1. CONFIGURATION & CONSTANTS
// ============================================
const CONFIG = {
    OPENWEATHER_API_KEY: '1151122405b6f7be33bf0de4b22bb5a4',
    NEWS_API_KEY: 'pub_0717253193ed4849a7be65b3c49eb1fa',
    DEFAULT_LOCATION: {
        lat: 36.752887,
        lon: 3.042048,
        name: 'الجزائر العاصمة',
        state: 'الجزائر العاصمة',
        country: 'الجزائر'
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
// 2. STATE MANAGEMENT
// ============================================
const AppState = {
    currentLocation: null,
    currentWeather: null,
    forecastData: null,
    weatherMap: null,
    mapMarker: null,
    currentLayer: 'temperature',
    tileLayers: {},
    temperatureChart: null,
    statsPeriod: 'daily',
    isLoading: false,
    lastUpdate: null,
    
    init() {
        const cached = LocationCache.get();
        if (cached && cached.timestamp > Date.now() - CONFIG.CACHE_DURATION) {
            this.currentLocation = cached.data;
            console.log('[State] Loaded from cache:', cached.data.name);
            return cached.data;
        }
        this.currentLocation = {...CONFIG.DEFAULT_LOCATION};
        console.log('[State] Using default location');
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

// ============================================
// 3. LOCATION CACHE MANAGER
// ============================================
const LocationCache = {
    KEY: 'algeria_weather_location',
    
    set(location) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify({
                data: location,
                timestamp: Date.now()
            }));
            console.log('[Cache] Location saved:', location.name);
        } catch (e) {
            console.warn('[Cache] Failed to save:', e);
        }
    },
    
    get() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('[Cache] Failed to read:', e);
            return null;
        }
    },
    
    clear() {
        localStorage.removeItem(this.KEY);
        console.log('[Cache] Cleared');
    },
    
    isValid() {
        const cached = this.get();
        return cached && (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION);
    }
};

// ============================================
// 4. NOTIFICATION MANAGER
// ============================================
const Notify = {
    element: null,
    text: null,
    timer: null,
    
    init() {
        this.element = document.getElementById('alertBanner');
        this.text = document.getElementById('alertText');
        document.getElementById('closeAlert')?.addEventListener('click', () => this.hide());
    },
    
    show(message, type = 'info', duration = 5000) {
        if (this.timer) clearTimeout(this.timer);
        this.text.textContent = message;
        this.element.className = `alert-banner visible ${type}`;
        if (duration > 0) {
            this.timer = setTimeout(() => this.hide(), duration);
        }
        console.log(`[Notify] ${type}: ${message}`);
    },
    
    hide() {
        this.element?.classList.remove('visible');
        if (this.timer) clearTimeout(this.timer);
    },
    
    loading(message) { this.show(message, 'info', 0); },
    success(message) { this.show(message, 'success', 3000); },
    error(message) { this.show(message, 'error', 6000); },
    warning(message) { this.show(message, 'warning', 5000); }
};

// ============================================
// 5. GEOLOCATION SERVICE
// ============================================
const GeoService = {
    async requestLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('المتصفح لا يدعم تحديد الموقع الجغرافي'));
                return;
            }
            Notify.loading('جارٍ تحديد موقعك...');
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => reject(this.handleError(error)),
                { enableHighAccuracy: true, timeout: CONFIG.GEO_TIMEOUT, maximumAge: 0 }
            );
        });
    },
    
    handleError(error) {
        const errors = {
            1: 'تم رفض إذن الوصول إلى الموقع. يرجى السماح بالوصول من إعدادات المتصفح.',
            2: 'معلومات الموقع غير متاحة حالياً.',
            3: 'انتهت مهلة تحديد الموقع.',
            0: 'حدث خطأ غير معروف أثناء تحديد الموقع.'
        };
        return new Error(errors[error.code] || errors[0]);
    },
    
    async reverseGeocode(lat, lon) {
        try {
            const url = `${CONFIG.GEO_API_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.OPENWEATHER_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Reverse geocoding failed');
            const data = await response.json();
            if (data && data.length > 0) return this.parseGeocodeData(data[0], lat, lon);
            throw new Error('No geocode results');
        } catch (error) {
            console.warn('[GeoService] Reverse geocode failed, using Nominatim:', error);
            return this.reverseGeocodeNominatim(lat, lon);
        }
    },
    
    async reverseGeocodeNominatim(lat, lon) {
        try {
            const url = `${CONFIG.NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=ar`;
            const response = await fetch(url, { headers: { 'User-Agent': 'meteo-dz/2.0' } });
            if (!response.ok) throw new Error('Nominatim failed');
            const data = await response.json();
            return this.parseNominatimData(data, lat, lon);
        } catch (error) {
            console.warn('[GeoService] Nominatim failed:', error);
            return this.createFallbackLocation(lat, lon);
        }
    },
    
    parseGeocodeData(data, lat, lon) {
        const localNames = data.local_names || {};
        const name = localNames.ar || localNames.fr || data.name || 'موقع غير معروف';
        const state = data.state || '';
        return {
            lat, lon, name, state,
            country: localNames.ar || data.country || 'الجزائر',
            displayName: this.buildDisplayName(name, state, 'الجزائر')
        };
    },
    
    parseNominatimData(data, lat, lon) {
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.hamlet || 'موقع غير معروف';
        const state = addr.state || addr.county || addr.district || '';
        const country = addr.country || 'الجزائر';
        return {
            lat, lon, name: city, state, country,
            displayName: this.buildDisplayName(city, state, country)
        };
    },
    
    buildDisplayName(city, state, country) {
        const parts = [city];
        if (state && state !== city) parts.push(state);
        parts.push(country);
        return parts.join(' / ');
    },
    
    createFallbackLocation(lat, lon) {
        return {
            lat, lon, name: 'الموقع الحالي', state: '', country: 'الجزائر',
            displayName: 'الموقع الحالي / الجزائر'
        };
    },
    
    async searchCities(query) {
        if (!query || query.length < 2) return [];
        const localResults = this.searchLocalCities(query);
        if (localResults.length > 0) return localResults;
        return this.searchNominatim(query);
    },
    
    searchLocalCities(query) {
        const q = query.toLowerCase();
        return ALGERIAN_CITIES
            .filter(city => city.name.toLowerCase().includes(q))
            .map(city => ({
                ...city,
                displayName: this.buildDisplayName(city.name, city.state, 'الجزائر')
            }));
    },
    
    async searchNominatim(query) {
        try {
            const url = `${CONFIG.NOMINATIM_URL}/search?format=json&addressdetails=1&limit=8&accept-language=ar&q=${encodeURIComponent(query)}`;
            const response = await fetch(url, { headers: { 'User-Agent': 'meteo-dz/2.0' } });
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            return data.map(place => {
                const addr = place.address || {};
                return {
                    lat: parseFloat(place.lat), lon: parseFloat(place.lon),
                    name: place.display_name.split(',')[0],
                    state: addr.state || addr.county || '',
                    country: addr.country || '',
                    displayName: place.display_name
                };
            });
        } catch (error) {
            console.error('[GeoService] Search failed:', error);
            return [];
        }
    }
};




// ============================================
// 6. ALGERIAN CITIES DATABASE
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

const CITY_NAME_MAP = {
    "Algiers": "الجزائر العاصمة",
    "Oran": "وهران",
    "Constantine": "قسنطينة",
    "Annaba": "عنابة",
    "Blida": "البليدة",
    "Setif": "سطيف",
    "Tamanrasset": "تمنراست"
};

// ============================================
// 7. WEATHER SERVICE
// ============================================
const WeatherService = {
    async fetchCurrentWeather(location) {
        const url = `${CONFIG.API_BASE_URL}/weather?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}&lang=ar`;
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch weather');
        }
        return response.json();
    },
    
    async fetchForecast(location) {
        const url = `${CONFIG.API_BASE_URL}/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}&lang=ar`;
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch forecast');
        }
        return response.json();
    },
    
    async fetchWeatherAtPoint(lat, lon) {
        const url = `${CONFIG.API_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}&lang=ar`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch point weather');
        return response.json();
    },
    
    getWeatherIcon(weatherId, isDay = true) {
        const icons = {
            thunder: { icon: 'fas fa-bolt', color: '#8e44ad' },
            drizzle: { icon: 'fas fa-cloud-rain', color: '#3498db' },
            rain: { icon: 'fas fa-cloud-showers-heavy', color: '#2980b9' },
            snow: { icon: 'fas fa-snowflake', color: '#60a5fa' },
            fog: { icon: 'fas fa-smog', color: '#94a3b8' },
            clear: { icon: isDay ? 'fas fa-sun' : 'fas fa-moon', color: isDay ? '#f1c40f' : '#64748b' },
            clouds: { icon: 'fas fa-cloud', color: '#94a3b8' }
        };
        if (weatherId >= 200 && weatherId < 300) return icons.thunder;
        if (weatherId >= 300 && weatherId < 500) return icons.drizzle;
        if (weatherId >= 500 && weatherId < 600) return icons.rain;
        if (weatherId >= 600 && weatherId < 700) return icons.snow;
        if (weatherId >= 700 && weatherId < 800) return icons.fog;
        if (weatherId === 800) return icons.clear;
        if (weatherId > 800) return icons.clouds;
        return icons.clear;
    },
    
    getWindDirection(degrees) {
        const directions = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
        return directions[Math.round((degrees % 360) / 45) % 8];
    },
    
    calculateWaveHeight(windSpeed) {
        return (windSpeed * 0.2).toFixed(1);
    },
    
    calculateWavePeriod(windSpeed) {
        return (windSpeed * 0.3).toFixed(1);
    },
    
    formatTime(date) {
        return date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    }
};




// ============================================
// 8. UI UPDATER
// ============================================
const UI = {
    elements: {},
    
    init() {
        this.cacheElements();
    },
    
    cacheElements() {
        const ids = [
            'alertBanner', 'alertText', 'closeAlert', 'siteHeader', 'mobileMenuBtn', 'mainNav',
            'searchInput', 'citySuggestions', 'locationBtn', 'currentCity', 'currentCountry',
            'updateTime', 'currentTemp', 'currentCondition', 'weatherIcon', 'weatherDetails',
            'hourlyForecast', 'forecastContainer', 'seaState', 'weatherMap', 'temperatureChart',
            'statsGrid', 'newsGrid', 'apiStatus', 'scrollTop', 'refreshWeather', 'refreshNews',
            'weatherTips', 'waveHeight', 'waveDirection', 'wavePeriod', 'seaTipsList',
            'cubeTemp1', 'cubeTemp2', 'cubeTemp3', 'cubeTemp4', 'cubeTemp5', 'cubeTemp6',
            'statCities', 'statAccuracy', 'statUsers', 'statMaxTemp', 'statMinTemp',
            'statRain', 'statWind'
        ];
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    },
    
    updateCurrentWeather(data, locationData) {
        if (!locationData) return;
        
        // Update location display with full details
        if (this.elements.currentCity) {
            this.elements.currentCity.textContent = locationData.displayName || locationData.name;
        }
        if (this.elements.currentCountry) {
            this.elements.currentCountry.textContent = locationData.country || 'الجزائر';
        }
        
        // Update temperature and condition
        if (this.elements.currentTemp) {
            this.elements.currentTemp.textContent = `${Math.round(data.main.temp)}°`;
        }
        if (this.elements.currentCondition) {
            this.elements.currentCondition.textContent = data.weather[0]?.description || 'غير معروف';
        }
        
        // Update weather icon
        const isDay = data.weather[0]?.icon?.includes('d') ?? true;
        const weatherInfo = WeatherService.getWeatherIcon(data.weather[0]?.id, isDay);
        if (this.elements.weatherIcon) {
            this.elements.weatherIcon.innerHTML = `<i class="${weatherInfo.icon}"></i>`;
            this.elements.weatherIcon.style.color = weatherInfo.color;
        }
        
        // Update details grid
        const details = [
            { icon: 'fas fa-temperature-high', label: 'الإحساس', value: `${Math.round(data.main.feels_like)}°C` },
            { icon: 'fas fa-tint', label: 'الرطوبة', value: `${data.main.humidity}%` },
            { icon: 'fas fa-wind', label: 'الرياح', value: `${Math.round(data.wind.speed * 3.6)} كم/س` },
            { icon: 'fas fa-compress-alt', label: 'الضغط', value: `${data.main.pressure} hPa` },
            { icon: 'fas fa-eye', label: 'الرؤية', value: `${(data.visibility / 1000).toFixed(1)} كم` },
            { icon: 'fas fa-cloud', label: 'السحب', value: `${data.clouds?.all || 0}%` },
            { icon: 'fas fa-location-arrow', label: 'اتجاه الرياح', value: WeatherService.getWindDirection(data.wind.deg || 0) },
            { icon: 'fas fa-sun', label: 'UV', value: data.uvi || '--' }
        ];
        
        if (this.elements.weatherDetails) {
            this.elements.weatherDetails.innerHTML = details.map(d => `
                <div class="detail-card">
                    <div class="detail-card-icon"><i class="${d.icon}"></i></div>
                    <div class="detail-card-value">${d.value}</div>
                    <div class="detail-card-label">${d.label}</div>
                </div>
            `).join('');
        }
        
        // Update cube temps
        this.updateCubeTemps(data.main.temp);
    },
    
    updateCubeTemps(temp) {
        const temps = [temp, temp - 2, temp + 1, temp - 1, temp + 8, temp - 3];
        temps.forEach((t, i) => {
            const el = this.elements[`cubeTemp${i + 1}`];
            if (el) el.textContent = `${Math.round(t)}°`;
        });
    },
    
    updateHourlyForecast(data) {
        const hourlyData = data.list.slice(0, 8);
        
        if (this.elements.hourlyForecast) {
            this.elements.hourlyForecast.innerHTML = hourlyData.map(item => {
                const date = new Date(item.dt * 1000);
                const hour = date.getHours();
                const temp = Math.round(item.main.temp);
                const isDay = hour >= 6 && hour < 18;
                const weatherInfo = WeatherService.getWeatherIcon(item.weather[0]?.id, isDay);
                
                return `
                    <div class="hourly-card">
                        <div class="hourly-time">${hour}:00</div>
                        <div class="hourly-icon"><i class="${weatherInfo.icon}" style="color:${weatherInfo.color}"></i></div>
                        <div class="hourly-temp">${temp}°</div>
                        <div class="hourly-desc">${item.weather[0]?.description || ''}</div>
                    </div>
                `;
            }).join('');
        }
    },
    
    update7DayForecast(data) {
        const dailyData = {};
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    temps: [], conditions: [], weatherIds: [],
                    date: date, dayName: days[date.getDay()],
                    dateStr: `${date.getDate()}/${date.getMonth() + 1}`
                };
            }
            dailyData[dayKey].temps.push(item.main.temp);
            dailyData[dayKey].conditions.push(item.weather[0]?.description || '');
            dailyData[dayKey].weatherIds.push(item.weather[0]?.id || 800);
        });
        
        const dailyEntries = Object.values(dailyData).slice(0, 7);
        
        if (this.elements.forecastContainer) {
            this.elements.forecastContainer.innerHTML = dailyEntries.map(day => {
                const maxTemp = Math.max(...day.temps);
                const minTemp = Math.min(...day.temps);
                const avgId = day.weatherIds[Math.floor(day.weatherIds.length / 2)];
                const weatherInfo = WeatherService.getWeatherIcon(avgId);
                const condition = day.conditions[Math.floor(day.conditions.length / 2)] || '';
                
                return `
                    <div class="forecast-card">
                        <div class="forecast-day">${day.dayName}</div>
                        <div class="forecast-date">${day.dateStr}</div>
                        <div class="forecast-icon"><i class="${weatherInfo.icon}" style="color:${weatherInfo.color}"></i></div>
                        <div class="forecast-condition">${condition}</div>
                        <div class="forecast-temps">
                            <span class="forecast-high">${Math.round(maxTemp)}°</span>
                            <span class="forecast-low">${Math.round(minTemp)}°</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },
    
    updateSeaState(data) {
        const waveHeight = WeatherService.calculateWaveHeight(data.wind.speed);
        const wavePeriod = WeatherService.calculateWavePeriod(data.wind.speed);
        const waveDir = WeatherService.getWindDirection(data.wind.deg || 0);
        
        if (this.elements.waveHeight) this.elements.waveHeight.textContent = waveHeight;
        if (this.elements.waveDirection) this.elements.waveDirection.textContent = waveDir;
        if (this.elements.wavePeriod) this.elements.wavePeriod.textContent = wavePeriod;
        
        // Update sea tips
        const height = parseFloat(waveHeight);
        let tips = [];
        if (height < 0.5) {
            tips = [
                '<i class="fas fa-check"></i> البحر هادئ - مثالي للسباحة',
                '<i class="fas fa-check"></i> مناسب لجميع الأنشطة البحرية',
                '<i class="fas fa-check"></i> حالة ممتازة للصيد',
                '<i class="fas fa-check"></i> آمن للقوارب الصغيرة'
            ];
        } else if (height < 1.5) {
            tips = [
                '<i class="fas fa-check"></i> البحر هادئ إلى متوسط',
                '<i class="fas fa-check"></i> مناسب لمعظم الأنشطة',
                '<i class="fas fa-exclamation-triangle"></i> احترس من التيارات',
                '<i class="fas fa-check"></i> راقب الأطفال أثناء السباحة'
            ];
        } else if (height < 2.5) {
            tips = [
                '<i class="fas fa-exclamation-triangle"></i> بحر مضطرب - احذر',
                '<i class="fas fa-times"></i> تجنب السباحة',
                '<i class="fas fa-times"></i> غير مناسب للقوارب الصغيرة',
                '<i class="fas fa-check"></i> ارتدِ سترة النجاة'
            ];
        } else {
            tips = [
                '<i class="fas fa-times"></i> بحر عالي الموج - خطر',
                '<i class="fas fa-times"></i> تجنب الأنشطة البحرية تماماً',
                '<i class="fas fa-times"></i> لا تخرج بالقوارب',
                '<i class="fas fa-exclamation-triangle"></i> انتظر حتى تهدأ الأمواج'
            ];
        }
        
        if (this.elements.seaTipsList) {
            this.elements.seaTipsList.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('');
        }
    },
    
    updateWeatherStats(currentData, forecastData) {
        const temps = forecastData.list.map(item => item.main.temp);
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const rainItems = forecastData.list.filter(item => item.weather[0]?.id >= 500 && item.weather[0]?.id < 600);
        const totalRain = rainItems.length * 2.5;
        const avgWind = forecastData.list.reduce((sum, item) => sum + item.wind.speed, 0) / forecastData.list.length;
        
        if (this.elements.statMaxTemp) this.elements.statMaxTemp.textContent = `${Math.round(maxTemp)}°`;
        if (this.elements.statMinTemp) this.elements.statMinTemp.textContent = `${Math.round(minTemp)}°`;
        if (this.elements.statRain) this.elements.statRain.textContent = `${totalRain.toFixed(1)}mm`;
        if (this.elements.statWind) this.elements.statWind.textContent = `${Math.round(avgWind * 3.6)}km/h`;
    },
    
    updateWeatherTips(data) {
        const temp = data.main.temp;
        const weatherId = data.weather[0]?.id || 800;
        const windSpeed = (data.wind.speed || 0) * 3.6;
        const tips = [];
        
        if (temp > 35) {
            tips.push({ icon: 'fas fa-temperature-high', title: 'موجة حرارة شديدة',
                text: 'تجنب التعرض للشمس بين 11 صباحاً و4 مساءً. اشرب الماء باستمرار واستخدم واقي الشمس.',
                severity: 'high' });
        }
        if (temp > 28) {
            tips.push({ icon: 'fas fa-tint', title: 'ترطيب الجسم',
                text: 'اشرب 8-10 أكواب من الماء يومياً. تجنب المشروبات الكافيينة والسكرية.',
                severity: 'medium' });
        }
        if (temp < 10) {
            tips.push({ icon: 'fas fa-snowflake', title: 'موجة برد',
                text: 'ارتدِ طبقات ملابس دافئة. احمِ يديك ورأسك. تجنب التعرض للرياح الباردة.',
                severity: 'high' });
        }
        if (weatherId >= 500 && weatherId < 600) {
            tips.push({ icon: 'fas fa-umbrella', title: 'توقعات أمطار',
                text: 'احمل مظلة وارتدِ ملابس مقاومة للماء. تجنب القيادة في المناطق المنخفضة.',
                severity: 'medium' });
        }
        if (windSpeed > 50) {
            tips.push({ icon: 'fas fa-wind', title: 'رياح قوية',
                text: 'ثبت الأشياء في الخارج. تجنب الوقوف تحت الأشجار أو اللوحات الإعلانية.',
                severity: 'high' });
        }
        if (weatherId >= 200 && weatherId < 300) {
            tips.push({ icon: 'fas fa-bolt', title: 'عواصف رعدية',
                text: 'ابقَ في الداخل. تجنب استخدام الأجهزة الكهربائية. ابتعد عن النوافذ.',
                severity: 'high' });
        }
        if (tips.length === 0) {
            tips.push({ icon: 'fas fa-sun', title: 'طقس معتدل',
                text: 'الأحوال الجوية مستقرة. فرصة ممتازة للأنشطة الخارجية. استمتع بيومك!',
                severity: 'low' });
        }
        
        if (this.elements.weatherTips) {
            this.elements.weatherTips.innerHTML = tips.slice(0, 3).map(tip => `
                <div class="tip-card">
                    <div class="tip-icon"><i class="${tip.icon}"></i></div>
                    <h3 class="tip-title">${tip.title}</h3>
                    <p class="tip-text">${tip.text}</p>
                    <span class="tip-severity ${tip.severity}">
                        ${tip.severity === 'high' ? 'تحذير عالي' : tip.severity === 'medium' ? 'تنبيه متوسط' : 'نصيحة عامة'}
                    </span>
                </div>
            `).join('');
        }
    },
    
    updateTemperatureChart(data) {
        const ctx = this.elements.temperatureChart?.getContext('2d');
        if (!ctx) return;
        
        const labels = [];
        const maxTemps = [];
        const minTemps = [];
        const dailyData = {};
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayStr = date.toLocaleDateString('ar-DZ', { weekday: 'short' });
            if (!dailyData[dayStr]) dailyData[dayStr] = { temps: [] };
            dailyData[dayStr].temps.push(item.main.temp);
        });
        
        let count = 0;
        for (const [day, info] of Object.entries(dailyData)) {
            if (count >= 7) break;
            labels.push(day);
            maxTemps.push(Math.round(Math.max(...info.temps)));
            minTemps.push(Math.round(Math.min(...info.temps)));
            count++;
        }
        
        if (AppState.temperatureChart) AppState.temperatureChart.destroy();
        
        AppState.temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'العليا', data: maxTemps, borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#e74c3c', pointBorderColor: '#fff', pointBorderWidth: 2 },
                    { label: 'الدنيا', data: minTemps, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#3498db', pointBorderColor: '#fff', pointBorderWidth: 2 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#a09888', font: { family: 'Cairo', size: 14 } } },
                    tooltip: { backgroundColor: 'rgba(10, 14, 26, 0.9)', titleColor: '#d4a853', bodyColor: '#e8e0d0', borderColor: 'rgba(212, 168, 83, 0.2)', borderWidth: 1, callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y}°C` } }
                },
                scales: {
                    y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#6b6560', callback: (value) => value + '°C', font: { family: 'Cairo' } } },
                    x: { grid: { display: false }, ticks: { color: '#6b6560', font: { family: 'Cairo' } } }
                }
            }
        });
    },
    
    setApiStatus(connected, message) {
        const status = this.elements.apiStatus;
        if (!status) return;
        
        if (connected) {
            status.innerHTML = '<i class="fas fa-check-circle"></i><span>متصل</span>';
            status.classList.remove('error');
        } else {
            status.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>خطأ في الاتصال</span>';
            status.classList.add('error');
        }
    },
    
    setLoadingState(isLoading) {
        const btn = this.elements.refreshWeather;
        if (btn) {
            btn.disabled = isLoading;
            btn.innerHTML = isLoading 
                ? '<span class="spinner"></span> جاري التحديث...'
                : '<i class="fas fa-sync-alt"></i> تحديث البيانات';
        }
        AppState.isLoading = isLoading;
    },
    
    setLocationLoading(isLoading) {
        const btn = this.elements.locationBtn;
        if (btn) {
            btn.innerHTML = isLoading 
                ? '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>'
                : '<i class="fas fa-location-crosshairs"></i>';
        }
    },
    
    updateTime() {
        if (this.elements.updateTime) {
            this.elements.updateTime.textContent = WeatherService.formatTime(new Date());
        }
    }
};

// ============================================
// 9. MAP SERVICE
// ============================================
const MapService = {
    map: null,
    marker: null,
    popups: [],
    
    init() {
        const location = AppState.currentLocation || CONFIG.DEFAULT_LOCATION;
        this.map = L.map('weatherMap').setView([location.lat, location.lon], 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 18
        }).addTo(this.map);
        
        this.updateLayer();
        this.updateMarker(location.lat, location.lon, location.displayName || location.name);
        
        // Click handler for weather at any point
        this.map.on('click', (e) => this.handleMapClick(e));
        
        // Resize handler
        window.addEventListener('resize', () => {
            setTimeout(() => this.map?.invalidateSize(), 100);
        });
    },
    
    updateLayer() {
        const urls = {
            temperature: `${CONFIG.TILE_URL}/temp_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`,
            precipitation: `${CONFIG.TILE_URL}/precipitation_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`,
            wind: `${CONFIG.TILE_URL}/wind_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`,
            clouds: `${CONFIG.TILE_URL}/clouds_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_API_KEY}`
        };
        
        const key = AppState.currentLayer;
        
        if (!AppState.tileLayers[key]) {
            AppState.tileLayers[key] = L.tileLayer(urls[key], {
                opacity: 0.6,
                maxZoom: 18,
                attribution: '© OpenWeatherMap'
            });
        }
        
        Object.keys(AppState.tileLayers).forEach(k => {
            if (this.map.hasLayer(AppState.tileLayers[k])) {
                this.map.removeLayer(AppState.tileLayers[k]);
            }
        });
        
        AppState.tileLayers[key].addTo(this.map);
        this.updateLegend();
    },
    
    updateLegend() {
        const legend = document.getElementById('mapLegend');
        if (!legend) return;
        
        const legends = {
            temperature: { title: 'درجة الحرارة (°C)', gradient: 'linear-gradient(to right, #0000FF, #00BFFF, #00FF7F, #FFD700, #FF4500)', labels: ['≤0°', '10°', '20°', '30°', '>30°'] },
            precipitation: { title: 'هطول الأمطار (مم)', gradient: 'linear-gradient(to right, #FFFFFF, #ADD8E6, #1E90FF, #0000FF)', labels: ['0', '5', '20', '≥20'] },
            wind: { title: 'سرعة الرياح (كم/س)', gradient: 'linear-gradient(to right, #00FF00, #FFFF00, #FFA500, #FF0000)', labels: ['0-10', '20', '40', '≥50'] },
            clouds: { title: 'الغطاء السحابي (%)', gradient: 'linear-gradient(to right, #FFFFFF, #CCCCCC, #888888, #555555)', labels: ['0%', '25%', '50%', '75%', '100%'] }
        };
        
        const l = legends[AppState.currentLayer];
        legend.innerHTML = `
            <h4>${l.title}</h4>
            <div class="legend-gradient" style="background: ${l.gradient};"></div>
            <div class="legend-labels">
                ${l.labels.map(label => `<span>${label}</span>`).join('')}
            </div>
        `;
    },
    
    updateMarker(lat, lon, title) {
        if (this.marker) this.map.removeLayer(this.marker);
        
        this.marker = L.marker([lat, lon]).addTo(this.map)
            .bindPopup(`<b style="font-family:Cairo;">${title}</b><br>انقر على الخريطة لاستكشاف المناطق`)
            .openPopup();
    },
    
    async handleMapClick(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        
        try {
            // Show loading popup
            const loadingPopup = L.popup()
                .setLatLng([lat, lon])
                .setContent('<div style="direction:rtl;font-family:Cairo;text-align:center;"><i class="fas fa-spinner fa-spin"></i> جارٍ التحميل...</div>')
                .openOn(this.map);
            
            // Fetch weather data
            const weatherData = await WeatherService.fetchWeatherAtPoint(lat, lon);
            
            // Get location name
            let locationName = 'موقع غير معروف';
            try {
                const geoData = await GeoService.reverseGeocode(lat, lon);
                locationName = geoData.displayName || geoData.name;
            } catch (e) {
                locationName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            }
            
            // Close loading popup
            this.map.closePopup(loadingPopup);
            
            // Show weather popup
            const isDay = weatherData.weather[0]?.icon?.includes('d') ?? true;
            const weatherInfo = WeatherService.getWeatherIcon(weatherData.weather[0]?.id, isDay);
            
            L.popup()
                .setLatLng([lat, lon])
                .setContent(`
                    <div style="direction:rtl;text-align:right;font-family:Cairo;min-width:220px;">
                        <h3 style="margin-bottom:8px;color:#d4a853;font-size:1.1rem;">
                            <i class="fas fa-map-marker-alt"></i> ${locationName}
                        </h3>
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                            <i class="${weatherInfo.icon}" style="font-size:2rem;color:${weatherInfo.color}"></i>
                            <div>
                                <div style="font-size:1.5rem;font-weight:800;color:#e8e0d0;">${Math.round(weatherData.main.temp)}°C</div>
                                <div style="color:#a09888;font-size:0.9rem;">${weatherData.weather[0]?.description || ''}</div>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem;color:#a09888;">
                            <div><i class="fas fa-tint" style="color:#3498db"></i> ${weatherData.main.humidity}%</div>
                            <div><i class="fas fa-wind" style="color:#94a3b8"></i> ${Math.round(weatherData.wind.speed * 3.6)} كم/س</div>
                            <div><i class="fas fa-compress-alt" style="color:#94a3b8"></i> ${weatherData.main.pressure} hPa</div>
                            <div><i class="fas fa-eye" style="color:#94a3b8"></i> ${(weatherData.visibility / 1000).toFixed(1)} كم</div>
                        </div>
                        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.75rem;color:#6b6560;">
                            <i class="fas fa-location-arrow"></i> ${lat.toFixed(4)}, ${lon.toFixed(4)}
                        </div>
                    </div>
                `)
                .openOn(this.map);
                
        } catch (error) {
            console.error('[MapService] Click handler error:', error);
            L.popup()
                .setLatLng([lat, lon])
                .setContent('<div style="direction:rtl;font-family:Cairo;color:#e74c3c;">تعذر جلب البيانات</div>')
                .openOn(this.map);
        }
    },
    
    setView(lat, lon, zoom = 10) {
        if (this.map) {
            this.map.setView([lat, lon], zoom);
        }
    }
};



// ============================================
// 10. NEWS SERVICE
// ============================================
const NewsService = {
    async fetchNews() {
        // Simulated news data - replace with actual API when available
        const newsData = [
            {
                title: 'تحذير من موجة حر في الجنوب الجزائري',
                excerpt: 'تتوقع مصالح الأرصاد الجوية موجة حر شديدة في ولايات الجنوب الأسبوع المقبل مع درجات حرارة تتجاوز 45 درجة مئوية.',
                category: 'alert',
                time: 'منذ 2 ساعة',
                image: 'https://images.unsplash.com/photo-1504370805625-d32c54b16100?w=600'
            },
            {
                title: 'تحسن في الأحوال الجوية بالشمال',
                excerpt: 'من المتوقع تحسن الأحوال الجوية بداية من يوم الغد مع انخفاض في درجات الحرارة وهبوب رياح معتدلة.',
                category: 'weather',
                time: 'منذ 4 ساعات',
                image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=600'
            },
            {
                title: 'دراسة: تغير المناخ يؤثر على الأمطار في الجزائر',
                excerpt: 'أظهرت دراسة حديثة تراجعاً في كميات الأمطار السنوية بنسبة 15% خلال العقد الماضي.',
                category: 'climate',
                time: 'منذ 6 ساعات',
                image: 'https://images.unsplash.com/photo-1526674183561-4f3fbf0f5d1f?w=600'
            }
        ];
        
        return newsData;
    },
    
    renderNews(newsData) {
        const container = document.getElementById('newsGrid');
        if (!container) return;
        
        container.innerHTML = newsData.map(item => `
            <div class="news-card">
                <div class="news-image">
                    <img src="${item.image}" alt="${item.title}" loading="lazy">
                </div>
                <div class="news-content">
                    <span class="news-category ${item.category}">
                        ${item.category === 'alert' ? 'تحذير' : item.category === 'weather' ? 'طقس' : 'مناخ'}
                    </span>
                    <h3 class="news-title">${item.title}</h3>
                    <p class="news-excerpt">${item.excerpt}</p>
                    <div class="news-meta">
                        <span><i class="fas fa-clock"></i> ${item.time}</span>
                        <span><i class="fas fa-eye"></i> قراءة</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

// ============================================
// 11. SEARCH SERVICE
// ============================================
const SearchService = {
    input: null,
    suggestions: null,
    debounceTimer: null,
    
    init() {
        this.input = document.getElementById('searchInput');
        this.suggestions = document.getElementById('citySuggestions');
        
        if (!this.input || !this.suggestions) return;
        
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', () => {
            if (this.input.value.length >= 2) this.handleInput({ target: this.input });
        });
        
        // Click on suggestion
        this.suggestions.addEventListener('click', (e) => {
            const item = e.target.closest('.city-suggestion-item');
            if (item) this.selectCity(item.dataset);
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                this.hideSuggestions();
            }
        });
    },
    
    handleInput(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }
        
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.search(query), 300);
    },
    
    async search(query) {
        const results = await GeoService.searchCities(query);
        this.renderSuggestions(results);
    },
    
    renderSuggestions(list) {
        if (!list || list.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.suggestions.innerHTML = list.slice(0, 8).map(city => `
            <div class="city-suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}" data-display="${city.displayName || city.name}">
                <div class="city-name">${city.name}</div>
                <div class="city-region">${city.state ? city.state + ' - ' : ''}${city.country || 'الجزائر'}</div>
            </div>
        `).join('');
        
        this.suggestions.classList.add('visible');
    },
    
    hideSuggestions() {
        this.suggestions?.classList.remove('visible');
    },
    
    selectCity(dataset) {
        const location = {
            lat: parseFloat(dataset.lat),
            lon: parseFloat(dataset.lon),
            name: dataset.name,
            displayName: dataset.display || dataset.name
        };
        
        this.input.value = location.name;
        this.hideSuggestions();
        App.setLocation(location);
    }
};

// ============================================
// 12. MAIN APPLICATION CONTROLLER
// ============================================
const App = {
    refreshTimer: null,
    
    async init() {
        console.log('[App] Initializing Algeria Weather Pro...');
        
        // Initialize services
        Notify.init();
        UI.init();
        SearchService.init();
        
        // Initialize state
        const location = AppState.init();
        console.log('[App] Initial location:', location.name);
        
        // Initialize map
        MapService.init();
        
        // Check if we should request GPS
        await this.checkAndRequestLocation();
        
        // Initial data load
        await this.loadWeatherData();
        await this.loadNews();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize animations
        this.initAnimations();
        
        console.log('[App] Initialization complete');
    },
    
    async checkAndRequestLocation() {
        // If we have valid cached location, use it
        if (LocationCache.isValid()) {
            console.log('[App] Using cached location');
            return;
        }
        
        // Otherwise, request GPS
        console.log('[App] No cached location, requesting GPS...');
        await this.updateLocationFromGPS();
    },
    
    async updateLocationFromGPS() {
        UI.setLocationLoading(true);
        
        try {
            const position = await GeoService.requestLocation();
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            console.log('[App] GPS coordinates:', lat, lon);
            
            // Reverse geocode
            const locationData = await GeoService.reverseGeocode(lat, lon);
            console.log('[App] Location resolved:', locationData.displayName);
            
            // Update state
            AppState.setLocation(locationData);
            
            // Update UI
            Notify.success(`تم تحديد موقعك: ${locationData.displayName}`);
            
            // Update map
            MapService.setView(lat, lon, 10);
            MapService.updateMarker(lat, lon, locationData.displayName);
            
            // Reload weather
            await this.loadWeatherData();
            
        } catch (error) {
            console.error('[App] GPS error:', error);
            Notify.error(error.message);
            
            // Use default location
            AppState.setLocation({...CONFIG.DEFAULT_LOCATION});
            Notify.warning('تم استخدام الموقع الافتراضي (الجزائر العاصمة)');
            
        } finally {
            UI.setLocationLoading(false);
        }
    },
    
    async loadWeatherData() {
        if (AppState.isLoading) return;
        
        UI.setLoadingState(true);
        Notify.loading('جارٍ تحميل بيانات الطقس...');
        
        try {
            const location = AppState.currentLocation;
            console.log('[App] Fetching weather for:', location.name);
            
            // Fetch current weather and forecast in parallel
            const [weatherData, forecastData] = await Promise.all([
                WeatherService.fetchCurrentWeather(location),
                WeatherService.fetchForecast(location)
            ]);
            
            // Update state
            AppState.setWeather(weatherData);
            AppState.forecastData = forecastData;
            
            // Update UI
            UI.updateCurrentWeather(weatherData, location);
            UI.updateHourlyForecast(forecastData);
            UI.update7DayForecast(forecastData);
            UI.updateSeaState(weatherData);
            UI.updateWeatherStats(weatherData, forecastData);
            UI.updateWeatherTips(weatherData);
            UI.updateTemperatureChart(forecastData);
            UI.updateTime();
            
            // Update map marker
            MapService.updateMarker(location.lat, location.lon, location.displayName || location.name);
            
            // Update API status
            UI.setApiStatus(true);
            
            Notify.success('تم تحديث بيانات الطقس بنجاح');
            
        } catch (error) {
            console.error('[App] Weather load error:', error);
            Notify.error(`خطأ في جلب البيانات: ${error.message}`);
            UI.setApiStatus(false);
            
            // If failed, try with default location
            if (AppState.currentLocation !== CONFIG.DEFAULT_LOCATION) {
                Notify.warning('جارٍ المحاولة بالموقع الافتراضي...');
                AppState.setLocation({...CONFIG.DEFAULT_LOCATION});
                await this.loadWeatherData();
            }
            
        } finally {
            UI.setLoadingState(false);
            Notify.hide();
        }
    },
    
    async loadNews() {
        try {
            const newsData = await NewsService.fetchNews();
            NewsService.renderNews(newsData);
        } catch (error) {
            console.error('[App] News load error:', error);
        }
    },
    
    setLocation(location) {
        AppState.setLocation(location);
        this.loadWeatherData();
        MapService.setView(location.lat, location.lon, 10);
    },
    
    setupAutoRefresh() {
        // Clear existing timer
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        
        // Set new timer (25 minutes)
        this.refreshTimer = setInterval(() => {
            console.log('[App] Auto-refreshing weather data...');
            this.loadWeatherData();
        }, CONFIG.REFRESH_INTERVAL);
        
        console.log(`[App] Auto-refresh set to ${CONFIG.REFRESH_INTERVAL / 60000} minutes`);
    },
    
    setupEventListeners() {
        // Refresh weather button
        document.getElementById('refreshWeather')?.addEventListener('click', () => {
            console.log('[App] Manual refresh requested');
            this.loadWeatherData();
        });
        
        // Location button (GPS)
        document.getElementById('locationBtn')?.addEventListener('click', () => {
            console.log('[App] Location update requested');
            this.updateLocationFromGPS();
        });
        
        // Refresh news button
        document.getElementById('refreshNews')?.addEventListener('click', () => {
            console.log('[App] News refresh requested');
            this.loadNews();
        });
        
        // Mobile menu
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            document.getElementById('mainNav')?.classList.toggle('active');
        });
        
        // Map layer buttons
        document.querySelectorAll('.map-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                AppState.currentLayer = this.dataset.layer;
                MapService.updateLayer();
            });
        });
        
        // Stats tabs
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                AppState.statsPeriod = this.dataset.period;
                Notify.success(`تم تغيير الفترة إلى: ${this.textContent}`);
            });
        });
        
        // Footer city links
        document.querySelectorAll('[data-city]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const cityKey = e.target.closest('[data-city]').dataset.city;
                const cityName = CITY_NAME_MAP[cityKey] || cityKey;
                const city = ALGERIAN_CITIES.find(c => c.name === cityName);
                if (city) {
                    this.setLocation({
                        lat: city.lat, lon: city.lon,
                        name: city.name, state: city.state, country: 'الجزائر',
                        displayName: GeoService.buildDisplayName(city.name, city.state, 'الجزائر')
                    });
                }
            });
        });
        
        // Smooth scroll for nav links
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
        
        // Scroll to top
        document.getElementById('scrollTop')?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Scroll events
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            const header = document.getElementById('siteHeader');
            const scrollTop = document.getElementById('scrollTop');
            
            // Header hide/show
            if (header) {
                if (currentScroll > lastScroll && currentScroll > 100) {
                    header.classList.add('hidden');
                } else {
                    header.classList.remove('hidden');
                }
                if (currentScroll > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            }
            
            // Scroll to top button
            if (scrollTop) {
                if (currentScroll > 300) scrollTop.classList.add('visible');
                else scrollTop.classList.remove('visible');
            }
            
            lastScroll = currentScroll;
        });
    },
    
    initAnimations() {
        // Star field
        this.initStarField();
        
        // Shader sphere
        this.initShaderSphere();
        
        // GSAP scroll animations
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
            document.querySelectorAll('section').forEach(section => {
                gsap.from(section.querySelectorAll('.section-header, .weather-card, .forecast-card, .stat-card, .tip-card, .warning-card, .news-card, .sea-item'), {
                    y: 30, opacity: 0, duration: 0.6, stagger: 0.1,
                    scrollTrigger: { trigger: section, start: 'top 80%', toggleActions: 'play none none none' }
                });
            });
        }
    },
    
    initStarField() {
        const canvas = document.getElementById('starCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        let width, height;
        const stars = [];
        const numStars = 200;
        const connectionDistance = 100;
        const mouse = { x: null, y: null };
        
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        
        function createStars() {
            stars.length = 0;
            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * width, y: Math.random() * height,
                    radius: Math.random() * 1.5 + 0.5,
                    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                    alpha: Math.random() * 0.5 + 0.3
                });
            }
        }
        
        function draw() {
            ctx.clearRect(0, 0, width, height);
            
            // Draw connections
            ctx.strokeStyle = 'rgba(212, 168, 83, 0.08)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < stars.length; i++) {
                for (let j = i + 1; j < stars.length; j++) {
                    const dx = stars[i].x - stars[j].x;
                    const dy = stars[i].y - stars[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(stars[i].x, stars[i].y);
                        ctx.lineTo(stars[j].x, stars[j].y);
                        ctx.globalAlpha = (1 - dist / connectionDistance) * 0.3;
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
            
            // Draw stars
            for (const star of stars) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 168, 83, ${star.alpha})`;
                ctx.fill();
                
                if (mouse.x !== null) {
                    const dx = mouse.x - star.x;
                    const dy = mouse.y - star.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(212, 168, 83, ${star.alpha * 0.5})`;
                        ctx.fill();
                    }
                }
                
                star.x += star.vx; star.y += star.vy;
                if (star.x < 0) star.x = width; if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height; if (star.y > height) star.y = 0;
                star.alpha += (Math.random() - 0.5) * 0.02;
                star.alpha = Math.max(0.2, Math.min(0.8, star.alpha));
            }
            requestAnimationFrame(draw);
        }
        
        canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
        canvas.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });
        window.addEventListener('resize', () => { resize(); createStars(); });
        
        resize(); createStars(); draw();
    },
    
    initShaderSphere() {
        const container = document.getElementById('shaderContainer');
        const canvas = document.getElementById('shaderCanvas');
        if (!container || !canvas || typeof THREE === 'undefined') return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const vertexShader = `
            varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
            uniform float uTime;
            void main() {
                vUv = uv; vNormal = normalize(normalMatrix * normal); vPosition = position;
                vec3 pos = position;
                float noise = sin(pos.x * 3.0 + uTime) * cos(pos.y * 3.0 + uTime) * sin(pos.z * 3.0 + uTime);
                pos += normal * noise * 0.1;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;
        
        const fragmentShader = `
            varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
            uniform float uTime;
            void main() {
                vec3 color1 = vec3(0.831, 0.659, 0.325);
                vec3 color2 = vec3(0.118, 0.227, 0.373);
                vec3 color3 = vec3(0.039, 0.055, 0.102);
                float noise = sin(vPosition.x * 5.0 + uTime * 0.5) * cos(vPosition.y * 5.0 + uTime * 0.3) * sin(vPosition.z * 5.0 + uTime * 0.7);
                vec3 finalColor = mix(color3, color2, noise * 0.5 + 0.5);
                finalColor = mix(finalColor, color1, pow(max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0));
                float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
                finalColor += color1 * fresnel * 0.5;
                gl_FragColor = vec4(finalColor, 0.9);
            }
        `;
        
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const material = new THREE.ShaderMaterial({
            vertexShader, fragmentShader,
            uniforms: { uTime: { value: 0 } },
            transparent: true, side: THREE.DoubleSide
        });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        
        const wireGeometry = new THREE.SphereGeometry(2.05, 32, 32);
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xd4a853, wireframe: true, transparent: true, opacity: 0.1 });
        const wireSphere = new THREE.Mesh(wireGeometry, wireMaterial);
        scene.add(wireSphere);
        
        camera.position.z = 5;
        let time = 0;
        
        function animate() {
            requestAnimationFrame(animate);
            time += 0.01;
            material.uniforms.uTime.value = time;
            sphere.rotation.y += 0.003; sphere.rotation.x += 0.001;
            wireSphere.rotation.y += 0.003; wireSphere.rotation.x += 0.001;
            renderer.render(scene, camera);
        }
        animate();
        
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }
};

// ============================================
// 13. START APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c[Algeria Weather Pro] Starting...', 'color: #d4a853; font-size: 14px; font-weight: bold;');
    App.init();
});

