<script>
    // API Keys and Configuration
    const CONFIG = {
        OPENWEATHER_API_KEY: '1151122405b6f7be33bf0de4b22bb5a4',
        NEWS_API_KEY: 'pub_0717253193ed4849a7be65b3c49eb1fa',
        DEFAULT_CITY: 'Algiers',
        DEFAULT_LAT: 36.7525,
        DEFAULT_LON: 3.042,
        MAP_TILES: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        MAP_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    };

    // Global Variables
    let map = null;
    let temperatureChart = null;
    let currentCity = CONFIG.DEFAULT_CITY;
    let currentLat = CONFIG.DEFAULT_LAT;
    let currentLon = CONFIG.DEFAULT_LON;
    let weatherData = null;
    let forecastData = null;

    // DOM Elements
    const elements = {
        currentCity: document.getElementById('currentCity'),
        updateTime: document.getElementById('updateTime'),
        currentTemp: document.getElementById('currentTemp'),
        currentCondition: document.getElementById('currentCondition'),
        weatherIcon: document.getElementById('weatherIcon'),
        weatherDetails: document.getElementById('weatherDetails'),
        forecastContainer: document.getElementById('forecastContainer'),
        hourlyForecast: document.getElementById('hourlyForecast'),
        weatherMap: document.getElementById('weatherMap'),
        temperatureChart: document.getElementById('temperatureChart'),
        statsGrid: document.getElementById('statsGrid'),
        newsTicker: document.getElementById('newsTicker'),
        newsGrid: document.getElementById('newsGrid'),
        galleryGrid: document.getElementById('galleryGrid'),
        searchInput: document.getElementById('searchInput'),
        citySuggestions: document.getElementById('citySuggestions'),
        apiStatus: document.getElementById('apiStatus'),
        alertBanner: document.getElementById('alertBanner'),
        alertText: document.getElementById('alertText'),
        locationBtn: document.getElementById('locationBtn'),
        refreshWeather: document.getElementById('refreshWeather'),
        refreshNews: document.getElementById('refreshNews'),
        themeToggle: document.getElementById('themeToggle'),
        closeAlert: document.getElementById('closeAlert'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        mainNav: document.getElementById('mainNav')
    };

    // Algerian Cities Database
    const ALGERIAN_CITIES = [
        { name: "الجزائر العاصمة", lat: 36.7525, lon: 3.042, en: "Algiers" },
        { name: "وهران", lat: 35.6971, lon: -0.6337, en: "Oran" },
        { name: "قسنطينة", lat: 36.365, lon: 6.6147, en: "Constantine" },
        { name: "عنابة", lat: 36.9, lon: 7.7667, en: "Annaba" },
        { name: "البليدة", lat: 36.4667, lon: 2.8333, en: "Blida" },
        { name: "سطيف", lat: 36.1912, lon: 5.4137, en: "Setif" },
        { name: "باتنة", lat: 35.5559, lon: 6.1741, en: "Batna" },
        { name: "جيجل", lat: 36.8206, lon: 5.7667, en: "Jijel" },
        { name: "تلمسان", lat: 34.8828, lon: -1.3167, en: "Tlemcen" },
        { name: "بسكرة", lat: 34.85, lon: 5.7333, en: "Biskra" },
        { name: "تيزي وزو", lat: 36.7167, lon: 4.05, en: "Tizi Ouzou" },
        { name: "الشلف", lat: 36.1654, lon: 1.3345, en: "Chlef" },
        { name: "البويرة", lat: 36.3762, lon: 3.9, en: "Bouira" },
        { name: "بجاية", lat: 36.7518, lon: 5.0564, en: "Bejaia" },
        { name: "سكيكدة", lat: 36.8794, lon: 6.9036, en: "Skikda" },
        { name: "الوادي", lat: 33.3683, lon: 6.8672, en: "El Oued" },
        { name: "غرداية", lat: 32.4839, lon: 3.6736, en: "Ghardaia" },
        { name: "أدرار", lat: 27.8743, lon: -0.2939, en: "Adrar" },
        { name: "تمنراست", lat: 22.785, lon: 5.5228, en: "Tamanrasset" }
    ];

    // Initialize the application
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    // Main initialization function
    async function initializeApp() {
        // Show loading state
        showAlert('جاري تحميل بيانات الطقس...', 'info');
        
        // Initialize event listeners
        setupEventListeners();
        
        // Initialize map
        initMap();
        
        // Check API connection
        await checkAPIConnection();
        
        // Get initial weather data
        await getWeatherData(CONFIG.DEFAULT_CITY);
        
        // Get weather forecast
        await getWeatherForecast();
        
        // Get news
        await getWeatherNews();
        
        // Get gallery images
        loadGalleryImages();
        
        // Update time display
        updateCurrentTime();
        
        // Set up auto-refresh
        setInterval(updateCurrentTime, 60000); // Update time every minute
        setInterval(() => getWeatherData(currentCity), 300000); // Refresh weather every 5 minutes
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Search functionality
        elements.searchInput.addEventListener('input', handleSearchInput);
        elements.searchInput.addEventListener('focus', showCitySuggestions);
        
        // Location button
        elements.locationBtn.addEventListener('click', getUserLocation);
        
        // Refresh buttons
        elements.refreshWeather.addEventListener('click', () => getWeatherData(currentCity));
        elements.refreshNews.addEventListener('click', getWeatherNews);
        
        // Theme toggle
        elements.themeToggle.addEventListener('click', toggleTheme);
        
        // Alert close
        elements.closeAlert.addEventListener('click', () => {
            elements.alertBanner.style.display = 'none';
        });
        
        // Mobile menu
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.mainNav.classList.toggle('active');
        });
        
        // Navigation links
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
                e.target.classList.add('active');
                
                // Smooth scroll to section
                const targetId = e.target.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
                
                // Close mobile menu if open
                if (window.innerWidth <= 768) {
                    elements.mainNav.classList.remove('active');
                }
            });
        });
        
        // Map layer controls
        document.querySelectorAll('.map-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateMapLayer(this.dataset.layer);
            });
        });
        
        // Footer city links
        document.querySelectorAll('.footer-column ul li a[data-city]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const cityName = this.dataset.city;
                getWeatherData(cityName);
                elements.searchInput.value = '';
            });
        });
        
        // View full forecast button
        document.getElementById('viewFullForecast').addEventListener('click', () => {
            alert('سيتم عرض التنبؤات الكاملة في نافذة جديدة...');
            // يمكنك إضافة المزيد من الوظائف هنا
        });
    }

    // Check API Connection
    async function checkAPIConnection() {
        try {
            // Test OpenWeatherMap API
            const weatherTest = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Algiers&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric&lang=ar`);
            
            if (weatherTest.ok) {
                elements.apiStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>API Connected</span>';
                elements.apiStatus.classList.remove('error');
                return true;
            } else {
                throw new Error('Weather API failed');
            }
        } catch (error) {
            console.error('API Connection Error:', error);
            elements.apiStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>API Connection Error</span>';
            elements.apiStatus.classList.add('error');
            showAlert('خطأ في الاتصال بخدمة الطقس. يتم استخدام بيانات تجريبية.', 'error');
            return false;
        }
    }

    // Get Weather Data
    async function getWeatherData(cityName) {
        try {
            // Show loading state
            elements.locationBtn.classList.add('loading');
            
            // Find city coordinates if Algerian city
            let city = ALGERIAN_CITIES.find(c => c.en === cityName || c.name.includes(cityName));
            let lat, lon;
            
            if (city) {
                lat = city.lat;
                lon = city.lon;
                currentCity = city.en;
            } else {
                // Use OpenWeatherMap geocoding for other cities
                const geoResponse = await fetch(
                    `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${CONFIG.OPENWEATHER_API_KEY}`
                );
                const geoData = await geoResponse.json();
                
                if (geoData.length > 0) {
                    lat = geoData[0].lat;
                    lon = geoData[0].lon;
                    currentCity = geoData[0].name;
                } else {
                    throw new Error('City not found');
                }
            }
            
            // Update current coordinates
            currentLat = lat;
            currentLon = lon;
            
            // Fetch current weather
            const weatherResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric&lang=ar`
            );
            
            if (!weatherResponse.ok) throw new Error('Weather data fetch failed');
            
            weatherData = await weatherResponse.json();
            
            // Update UI with weather data
            updateCurrentWeatherUI(weatherData);
            
            // Update map marker
            updateMapMarker(lat, lon, weatherData);
            
            // Get forecast data
            await getWeatherForecast();
            
            // Update stats
            updateWeatherStats(weatherData);
            
            // Success state
            elements.locationBtn.classList.remove('loading');
            elements.locationBtn.classList.add('success');
            setTimeout(() => elements.locationBtn.classList.remove('success'), 2000);
            
            showAlert(`تم تحميل بيانات الطقس لـ ${city ? city.name : currentCity}`, 'success');
            
            return true;
            
        } catch (error) {
            console.error('Weather Data Error:', error);
            
            // Fallback to demo data
            loadDemoWeatherData(cityName);
            
            elements.locationBtn.classList.remove('loading');
            elements.locationBtn.classList.add('error');
            setTimeout(() => elements.locationBtn.classList.remove('error'), 3000);
            
            showAlert(`خطأ في تحميل بيانات الطقس: ${error.message}`, 'error');
            return false;
        }
    }

    // Get Weather Forecast
    async function getWeatherForecast() {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${currentLat}&lon=${currentLon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric&lang=ar`
            );
            
            if (!response.ok) throw new Error('Forecast data fetch failed');
            
            forecastData = await response.json();
            
            // Update forecast UI
            updateForecastUI(forecastData);
            
            // Update hourly forecast
            updateHourlyForecast(forecastData);
            
            // Update temperature chart
            updateTemperatureChart(forecastData);
            
        } catch (error) {
            console.error('Forecast Error:', error);
            loadDemoForecastData();
        }
    }

    // Get Weather News
    async function getWeatherNews() {
        try {
            // Show loading in news section
            elements.newsTicker.innerHTML = '<div class="spinner"></div> جاري تحميل الأخبار...';
            
            // Fetch weather news from NewsAPI
            const response = await fetch(
                `https://newsdata.io/api/1/news?apikey=${CONFIG.NEWS_API_KEY}&q=weather&country=DZ&language=ar&category=environment`
            );
            
            if (!response.ok) throw new Error('News API failed');
            
            const newsData = await response.json();
            
            // Update news ticker
            updateNewsTicker(newsData.results || []);
            
            // Update news grid
            updateNewsGrid(newsData.results || []);
            
        } catch (error) {
            console.error('News Error:', error);
            
            // Fallback news data
            const fallbackNews = [
                {
                    title: "تقلبات جوية متوقعة في شمال الجزائر",
                    description: "من المتوقع أن تشهد ولايات الشمال تقلبات جوية مع هطول أمطار متفرقة",
                    pubDate: new Date().toISOString(),
                    source_id: "وزارة البيئة"
                },
                {
                    title: "تحذير من ارتفاع درجات الحرارة في الجنوب",
                    description: "تصل درجات الحرارة في ولايات الجنوب إلى 45 درجة مئوية نهار اليوم",
                    pubDate: new Date(Date.now() - 3600000).toISOString(),
                    source_id: "الديوان الوطني للأرصاد الجوية"
                },
                {
                    title: "استقرار الأحوال الجوية في الوسط",
                    description: "أحوال جوية مستقرة مع درجات حرارة معتدلة في الولايات الوسطى",
                    pubDate: new Date(Date.now() - 7200000).toISOString(),
                    source_id: "الطقس الجزائري"
                }
            ];
            
            updateNewsTicker(fallbackNews);
            updateNewsGrid(fallbackNews);
        }
    }

    // Initialize Map
    function initMap() {
        map = L.map('weatherMap').setView([CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON], 6);
        
        L.tileLayer(CONFIG.MAP_TILES, {
            attribution: CONFIG.MAP_ATTRIBUTION,
            maxZoom: 18,
        }).addTo(map);
        
        // Add initial marker
        const marker = L.marker([CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LON]).addTo(map)
            .bindPopup('الجزائر العاصمة')
            .openPopup();
    }

    // Update Map Marker
    function updateMapMarker(lat, lon, weatherData) {
        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        
        // Add new marker
        const marker = L.marker([lat, lon]).addTo(map);
        
        // Update popup with weather info
        const temp = weatherData.main.temp;
        const condition = weatherData.weather[0].description;
        marker.bindPopup(`
            <strong>${weatherData.name}</strong><br>
            ${temp}°C - ${condition}<br>
            الرطوبة: ${weatherData.main.humidity}%<br>
            الرياح: ${weatherData.wind.speed} م/ث
        `).openPopup();
        
        // Center map on marker
        map.setView([lat, lon], 10);
    }

    // Update Map Layer
    function updateMapLayer(layerType) {
        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        let tileUrl;
        
        switch(layerType) {
            case 'temperature':
                tileUrl = 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=' + CONFIG.OPENWEATHER_API_KEY;
                break;
            case 'precipitation':
                tileUrl = 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=' + CONFIG.OPENWEATHER_API_KEY;
                break;
            case 'wind':
                tileUrl = 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=' + CONFIG.OPENWEATHER_API_KEY;
                break;
            case 'clouds':
                tileUrl = 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=' + CONFIG.OPENWEATHER_API_KEY;
                break;
            default:
                tileUrl = CONFIG.MAP_TILES;
        }
        
        L.tileLayer(tileUrl, {
            attribution: CONFIG.MAP_ATTRIBUTION,
            maxZoom: 18,
        }).addTo(map);
    }

    // Get User Location
    function getUserLocation() {
        if (!navigator.geolocation) {
            showAlert('المتصفح لا يدعم تحديد الموقع الجغرافي', 'error');
            return;
        }
        
        elements.locationBtn.classList.add('loading');
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Reverse geocode to get city name
                try {
                    const response = await fetch(
                        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.OPENWEATHER_API_KEY}`
                    );
                    const geoData = await response.json();
                    
                    if (geoData.length > 0) {
                        currentCity = geoData[0].name;
                        currentLat = lat;
                        currentLon = lon;
                        
                        // Get weather for this location
                        await getWeatherData(currentCity);
                    }
                } catch (error) {
                    console.error('Reverse geocode error:', error);
                    showAlert('تم تحديد موقعك ولكن لم نتمكن من الحصول على اسم المدينة', 'warning');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                elements.locationBtn.classList.remove('loading');
                elements.locationBtn.classList.add('error');
                setTimeout(() => elements.locationBtn.classList.remove('error'), 3000);
                
                let errorMessage = 'فشل في تحديد الموقع الجغرافي';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'تم رفض الإذن للوصول إلى الموقع الجغرافي';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'معلومات الموقع غير متوفرة';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'انتهت مهلة طلب الموقع';
                        break;
                }
                showAlert(errorMessage, 'error');
            }
        );
    }

    // Update Current Weather UI
    function updateCurrentWeatherUI(data) {
        // Update basic info
        elements.currentCity.textContent = `${data.name}, الجزائر`;
        elements.currentTemp.textContent = `${Math.round(data.main.temp)}°`;
        elements.currentCondition.textContent = data.weather[0].description;
        
        // Update weather icon
        const iconCode = data.weather[0].icon;
        const iconClass = getWeatherIconClass(iconCode);
        elements.weatherIcon.innerHTML = `<i class="fas ${iconClass}"></i>`;
        
        // Update weather details
        const detailsHTML = `
            <div class="detail-item">
                <i class="fas fa-temperature-low"></i>
                <div>${Math.round(data.main.feels_like)}°</div>
                <div>تشعر كأنها</div>
            </div>
            <div class="detail-item">
                <i class="fas fa-tint"></i>
                <div>${data.main.humidity}%</div>
                <div>الرطوبة</div>
            </div>
            <div class="detail-item">
                <i class="fas fa-wind"></i>
                <div>${data.wind.speed} م/ث</div>
                <div>سرعة الرياح</div>
            </div>
            <div class="detail-item">
                <i class="fas fa-compress-alt"></i>
                <div>${data.main.pressure} hPa</div>
                <div>الضغط</div>
            </div>
        `;
        
        elements.weatherDetails.innerHTML = detailsHTML;
        
        // Update time
        elements.updateTime.textContent = new Date().toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Update Forecast UI
    function updateForecastUI(data) {
        // Group forecasts by day
        const dailyForecasts = {};
        
        data.list.forEach(forecast => {
            const date = new Date(forecast.dt * 1000).toLocaleDateString('ar-EG', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
            
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    temps: [],
                    conditions: [],
                    icons: []
                };
            }
            
            dailyForecasts[date].temps.push(forecast.main.temp);
            dailyForecasts[date].conditions.push(forecast.weather[0].description);
            dailyForecasts[date].icons.push(forecast.weather[0].icon);
        });
        
        // Generate forecast cards (next 7 days)
        let forecastHTML = '';
        const dates = Object.keys(dailyForecasts);
        
        for (let i = 0; i < Math.min(7, dates.length); i++) {
            const date = dates[i];
            const dayData = dailyForecasts[date];
            
            // Calculate min and max temps
            const maxTemp = Math.max(...dayData.temps);
            const minTemp = Math.min(...dayData.temps);
            
            // Get most common condition
            const condition = dayData.conditions[Math.floor(dayData.conditions.length / 2)];
            const iconCode = dayData.icons[Math.floor(dayData.icons.length / 2)];
            const iconClass = getWeatherIconClass(iconCode);
            
            // Extract day name
            const dayName = date.split('،')[0];
            
            forecastHTML += `
                <div class="forecast-card">
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-date">${date.split('،')[1]}</div>
                    <div class="forecast-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="forecast-condition">${condition}</div>
                    <div class="forecast-temp">
                        <span class="high-temp">${Math.round(maxTemp)}°</span>
                        <span class="low-temp">${Math.round(minTemp)}°</span>
                    </div>
                </div>
            `;
        }
        
        elements.forecastContainer.innerHTML = forecastHTML;
    }

    // Update Hourly Forecast
    function updateHourlyForecast(data) {
        let hourlyHTML = '';
        
        // Show next 24 hours (8 forecasts, 3-hour intervals)
        for (let i = 0; i < Math.min(8, data.list.length); i++) {
            const forecast = data.list[i];
            const time = new Date(forecast.dt * 1000).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const temp = Math.round(forecast.main.temp);
            const iconCode = forecast.weather[0].icon;
            const iconClass = getWeatherIconClass(iconCode);
            
            hourlyHTML += `
                <div class="hourly-card">
                    <div class="hourly-time">${time}</div>
                    <div class="hourly-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="hourly-temp">${temp}°</div>
                    <div class="hourly-condition">${forecast.weather[0].description}</div>
                </div>
            `;
        }
        
        elements.hourlyForecast.innerHTML = hourlyHTML;
    }

    // Update Temperature Chart
    function updateTemperatureChart(data) {
        // Destroy existing chart if it exists
        if (temperatureChart) {
            temperatureChart.destroy();
        }
        
        // Prepare data for chart
        const labels = [];
        const temps = [];
        
        // Get data for next 7 days
        const dailyForecasts = {};
        
        data.list.forEach(forecast => {
            const date = new Date(forecast.dt * 1000).toLocaleDateString('ar-EG', {
                weekday: 'short'
            });
            
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = [];
            }
            
            dailyForecasts[date].push(forecast.main.temp);
        });
        
        // Calculate average temps for each day
        Object.keys(dailyForecasts).forEach((day, index) => {
            if (index < 7) {
                const avgTemp = dailyForecasts[day].reduce((a, b) => a + b, 0) / dailyForecasts[day].length;
                labels.push(day);
                temps.push(avgTemp);
            }
        });
        
        // Create chart
        const ctx = elements.temperatureChart.getContext('2d');
        temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'درجة الحرارة (°C)',
                    data: temps,
                    borderColor: 'rgba(220, 38, 38, 1)', // Algeria red
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                family: 'Cairo',
                                size: 14
                            },
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#1e293b'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            font: {
                                family: 'Cairo',
                                size: 12
                            },
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#1e293b'
                        }
                    },
                    x: {
                        grid: {
                            color: document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            font: {
                                family: 'Cairo',
                                size: 12
                            },
                            color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#1e293b'
                        }
                    }
                }
            }
        });
    }

    // Update Weather Stats
    function updateWeatherStats(data) {
        const statsHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-thermometer-half"></i>
                </div>
                <div class="stat-value">${Math.round(data.main.temp_max)}°</div>
                <div class="stat-label">أقصى درجة حرارة</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-thermometer-quarter"></i>
                </div>
                <div class="stat-value">${Math.round(data.main.temp_min)}°</div>
                <div class="stat-label">أدنى درجة حرارة</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="stat-value">${data.visibility / 1000} كم</div>
                <div class="stat-label">مدى الرؤية</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-sun"></i>
                </div>
                <div class="stat-value">${new Date(data.sys.sunrise * 1000).toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'})}</div>
                <div class="stat-label">وقت الشروق</div>
            </div>
        `;
        
        elements.statsGrid.innerHTML = statsHTML;
    }

    // Update News Ticker
    function updateNewsTicker(newsItems) {
        let tickerHTML = '';
        
        newsItems.slice(0, 5).forEach((item, index) => {
            const time = new Date(item.pubDate).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            tickerHTML += `
                <div class="news-item">
                    <h4>${item.title || 'خبر عاجل'}</h4>
                    <p>${item.description || 'تفاصيل الخبر غير متوفرة'}</p>
                    <div class="news-time">
                        ${time} | ${item.source_id || 'مصدر غير معروف'}
                    </div>
                </div>
            `;
        });
        
        elements.newsTicker.innerHTML = tickerHTML;
    }

    // Update News Grid
    function updateNewsGrid(newsItems) {
        let gridHTML = '';
        
        newsItems.slice(0, 6).forEach((item, index) => {
            const date = new Date(item.pubDate).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            gridHTML += `
                <div class="news-card">
                    <div class="news-image">
                        <img src="${item.image_url || 'https://images.unsplash.com/photo-1592210454359-9043f067919b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" alt="${item.title}">
                    </div>
                    <div class="news-content">
                        <h3>${item.title || 'خبر طقس جديد'}</h3>
                        <p>${item.description || 'تفاصيل خبر الطقس الحالي'}</p>
                        <div class="news-meta">
                            <span>${date}</span>
                            <span>${item.source_id || 'مصدر'}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        elements.newsGrid.innerHTML = gridHTML;
    }

    // Load Gallery Images
    function loadGalleryImages() {
        const galleryImages = [
            {
                url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                title: 'السماء الصافية في الجزائر العاصمة'
            },
            {
                url: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                title: 'أمطار الشتاء في قسنطينة'
            },
            {
                url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                title: 'غروب الشمس في وهران'
            },
            {
                url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                title: 'الطقس المشمس في عنابة'
            },
            {
                url: 'https://images.unsplash.com/photo-1563974318767-a4de855d7b43?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                title: 'الثلوج في جبال الأطلس'
            },
            {
                url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                title: 'العواصف الرملية في الصحراء'
            }
        ];
        
        let galleryHTML = '';
        
        galleryImages.forEach(image => {
            galleryHTML += `
                <div class="gallery-item">
                    <img src="${image.url}" alt="${image.title}">
                    <div class="gallery-overlay">
                        <h4>${image.title}</h4>
                    </div>
                </div>
            `;
        });
        
        elements.galleryGrid.innerHTML = galleryHTML;
    }

    // Handle Search Input
    function handleSearchInput(e) {
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length === 0) {
            elements.citySuggestions.classList.add('hidden');
            return;
        }
        
        // Filter cities based on search term
        const filteredCities = ALGERIAN_CITIES.filter(city => 
            city.name.includes(searchTerm) || city.en.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        showCitySuggestionsList(filteredCities.slice(0, 8));
    }

    // Show City Suggestions
    function showCitySuggestions() {
        if (elements.searchInput.value.trim().length === 0) {
            showCitySuggestionsList(ALGERIAN_CITIES.slice(0, 5));
        }
    }

    // Show City Suggestions List
    function showCitySuggestionsList(cities) {
        if (cities.length === 0) {
            elements.citySuggestions.classList.add('hidden');
            return;
        }
        
        let suggestionsHTML = '';
        
        cities.forEach(city => {
            suggestionsHTML += `
                <div class="city-suggestion-item" data-city="${city.en}">
                    ${city.name} (${city.en})
                </div>
            `;
        });
        
        elements.citySuggestions.innerHTML = suggestionsHTML;
        elements.citySuggestions.classList.remove('hidden');
        
        // Add click event to suggestion items
        elements.citySuggestions.querySelectorAll('.city-suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                const cityName = this.dataset.city;
                elements.searchInput.value = this.textContent.split(' (')[0];
                elements.citySuggestions.classList.add('hidden');
                getWeatherData(cityName);
            });
        });
        
        // Close suggestions when clicking outside
        document.addEventListener('click', function closeSuggestions(e) {
            if (!elements.searchInput.contains(e.target) && !elements.citySuggestions.contains(e.target)) {
                elements.citySuggestions.classList.add('hidden');
                document.removeEventListener('click', closeSuggestions);
            }
        });
    }

    // Toggle Theme
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const icon = elements.themeToggle.querySelector('i');
        
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }
        
        // Update chart colors if exists
        if (temperatureChart) {
            temperatureChart.update();
        }
    }

    // Update Current Time
    function updateCurrentTime() {
        const now = new Date();
        elements.updateTime.textContent = now.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Show Alert
    function showAlert(message, type = 'info') {
        elements.alertText.textContent = message;
        elements.alertBanner.style.display = 'flex';
        
        // Set color based on type
        switch(type) {
            case 'success':
                elements.alertBanner.style.backgroundColor = '#10b981';
                break;
            case 'error':
                elements.alertBanner.style.backgroundColor = '#dc2626';
                break;
            case 'warning':
                elements.alertBanner.style.backgroundColor = '#f59e0b';
                break;
            default:
                elements.alertBanner.style.backgroundColor = '#3b82f6';
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (elements.alertBanner.style.display !== 'none') {
                elements.alertBanner.style.display = 'none';
            }
        }, 5000);
    }

    // Get Weather Icon Class
    function getWeatherIconClass(iconCode) {
        const iconMap = {
            '01d': 'fa-sun',           // clear sky day
            '01n': 'fa-moon',          // clear sky night
            '02d': 'fa-cloud-sun',     // few clouds day
            '02n': 'fa-cloud-moon',    // few clouds night
            '03d': 'fa-cloud',         // scattered clouds
            '03n': 'fa-cloud',
            '04d': 'fa-cloud',         // broken clouds
            '04n': 'fa-cloud',
            '09d': 'fa-cloud-rain',    // shower rain
            '09n': 'fa-cloud-rain',
            '10d': 'fa-cloud-sun-rain',// rain day
            '10n': 'fa-cloud-moon-rain',// rain night
            '11d': 'fa-bolt',          // thunderstorm
            '11n': 'fa-bolt',
            '13d': 'fa-snowflake',     // snow
            '13n': 'fa-snowflake',
            '50d': 'fa-smog',          // mist
            '50n': 'fa-smog'
        };
        
        return iconMap[iconCode] || 'fa-cloud';
    }

    // Demo Data (Fallback)
    function loadDemoWeatherData(cityName) {
        const demoData = {
            name: cityName || 'الجزائر العاصمة',
            main: {
                temp: 25,
                feels_like: 27,
                temp_min: 22,
                temp_max: 28,
                pressure: 1013,
                humidity: 65
            },
            weather: [{
                description: 'مشمس جزئياً',
                icon: '02d'
            }],
            wind: {
                speed: 3.5
            },
            visibility: 10000,
            sys: {
                sunrise: Date.now() / 1000 - 36000,
                sunset: Date.now() / 1000 + 36000
            }
        };
        
        updateCurrentWeatherUI(demoData);
        updateWeatherStats(demoData);
        
        // Update map with demo location
        const city = ALGERIAN_CITIES.find(c => c.en === cityName) || ALGERIAN_CITIES[0];
        updateMapMarker(city.lat, city.lon, demoData);
    }

    function loadDemoForecastData() {
        const demoForecast = {
            list: []
        };
        
        // Generate demo forecast for next 5 days
        for (let i = 0; i < 5; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            demoForecast.list.push({
                dt: date.getTime() / 1000,
                main: {
                    temp: 20 + Math.random() * 10
                },
                weather: [{
                    description: i % 3 === 0 ? 'مشمس' : i % 3 === 1 ? 'غائم جزئياً' : 'ممطر',
                    icon: i % 3 === 0 ? '01d' : i % 3 === 1 ? '02d' : '10d'
                }]
            });
        }
        
        updateForecastUI(demoForecast);
        updateHourlyForecast(demoForecast);
        updateTemperatureChart(demoForecast);
    }

    // Check saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = elements.themeToggle.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    

    // ============ إضافة نظام البحث عن المدن داخل الخريطة ============

// Global variables for map search
let mapSearchMarker = null;
let mapSearchLayer = null;
let mapSearchControl = null;

// Initialize Map Search Functionality
function initMapSearch() {
    // Add search control to map
    mapSearchControl = L.control({position: 'topright'});
    
    mapSearchControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-search-control');
        div.innerHTML = `
            <div class="map-search-container">
                <input type="text" id="mapSearchInput" 
                       placeholder="ابحث عن أي مدينة في العالم..." 
                       style="width: 250px; padding: 8px; border-radius: 20px; border: 2px solid var(--algeria-green);">
                <button id="mapSearchBtn" 
                        style="background: var(--algeria-green); color: white; border: none; 
                               padding: 8px 12px; border-radius: 20px; margin-right: 5px; cursor: pointer;">
                    <i class="fas fa-search"></i>
                </button>
                <div id="mapSearchResults" 
                     style="position: absolute; background: white; width: 100%; max-height: 200px; 
                            overflow-y: auto; display: none; z-index: 1000; border-radius: 10px;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.2); margin-top: 5px;">
                </div>
            </div>
        `;
        
        // Prevent map clicks from propagating through the control
        L.DomEvent.disableClickPropagation(div);
        
        return div;
    };
    
    mapSearchControl.addTo(map);
    
    // Add search functionality
    const mapSearchInput = document.getElementById('mapSearchInput');
    const mapSearchBtn = document.getElementById('mapSearchBtn');
    const mapSearchResults = document.getElementById('mapSearchResults');
    
    // Search on button click
    mapSearchBtn.addEventListener('click', () => {
        const query = mapSearchInput.value.trim();
        if (query) {
            searchCityOnMap(query);
        }
    });
    
    // Search on Enter key
    mapSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = mapSearchInput.value.trim();
            if (query) {
                searchCityOnMap(query);
            }
        }
    });
    
    // Add click listener to map for coordinate-based search
    map.on('click', function(e) {
        getWeatherByCoordinates(e.latlng.lat, e.latlng.lng);
        
        // Add click marker
        if (mapSearchMarker) {
            map.removeLayer(mapSearchMarker);
        }
        
        mapSearchMarker = L.marker(e.latlng).addTo(map)
            .bindPopup(`إحداثيات الموقع:<br>${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}<br>
                        <button class="btn" style="padding: 5px 10px; margin-top: 5px; font-size: 12px;" 
                                onclick="getWeatherByCoordinates(${e.latlng.lat}, ${e.latlng.lng})">
                            عرض حالة الطقس
                        </button>`)
            .openPopup();
    });
}

// Search for any city worldwide
async function searchCityOnMap(query) {
    try {
        // Show loading state
        const mapSearchResults = document.getElementById('mapSearchResults');
        mapSearchResults.innerHTML = '<div style="padding: 10px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</div>';
        mapSearchResults.style.display = 'block';
        
        // Use OpenWeatherMap Geocoding API
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${CONFIG.OPENWEATHER_API_KEY}`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const cities = await response.json();
        
        // Clear previous results
        mapSearchResults.innerHTML = '';
        
        if (cities.length === 0) {
            mapSearchResults.innerHTML = '<div style="padding: 10px; text-align: center;">لم يتم العثور على مدن مطابقة</div>';
        } else {
            cities.forEach(city => {
                const cityDiv = document.createElement('div');
                cityDiv.className = 'city-search-result';
                cityDiv.style.padding = '10px';
                cityDiv.style.borderBottom = '1px solid #eee';
                cityDiv.style.cursor = 'pointer';
                cityDiv.style.transition = 'background 0.3s';
                
                // Determine country name in Arabic
                let countryName = city.country;
                if (city.country === 'DZ') countryName = 'الجزائر';
                else if (city.country === 'MA') countryName = 'المغرب';
                else if (city.country === 'TN') countryName = 'تونس';
                else if (city.country === 'EG') countryName = 'مصر';
                else if (city.country === 'SA') countryName = 'السعودية';
                else if (city.country === 'AE') countryName = 'الإمارات';
                
                cityDiv.innerHTML = `
                    <div style="font-weight: bold;">${city.name}</div>
                    <div style="font-size: 12px; color: #666;">
                        ${city.state ? city.state + ', ' : ''}${countryName}
                    </div>
                    <div style="font-size: 11px; color: #999;">
                        إحداثيات: ${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}
                    </div>
                `;
                
                cityDiv.addEventListener('click', () => {
                    // Center map on selected city
                    map.setView([city.lat, city.lon], 10);
                    
                    // Add marker for the city
                    if (mapSearchMarker) {
                        map.removeLayer(mapSearchMarker);
                    }
                    
                    mapSearchMarker = L.marker([city.lat, city.lon]).addTo(map)
                        .bindPopup(`<strong>${city.name}, ${countryName}</strong><br>
                                   <button class="btn" style="padding: 5px 10px; margin-top: 5px; font-size: 12px;" 
                                           onclick="getWeatherByCoordinates(${city.lat}, ${city.lon}, '${city.name}')">
                                       عرض حالة الطقس
                                   </button>`)
                        .openPopup();
                    
                    // Hide results
                    mapSearchResults.style.display = 'none';
                    
                    // Update search input
                    document.getElementById('mapSearchInput').value = `${city.name}, ${countryName}`;
                    
                    // Show success message
                    showAlert(`تم العثور على ${city.name}، ${countryName}`, 'success');
                });
                
                cityDiv.addEventListener('mouseenter', () => {
                    cityDiv.style.backgroundColor = '#f0f8ff';
                });
                
                cityDiv.addEventListener('mouseleave', () => {
                    cityDiv.style.backgroundColor = 'white';
                });
                
                mapSearchResults.appendChild(cityDiv);
            });
        }
        
    } catch (error) {
        console.error('City search error:', error);
        const mapSearchResults = document.getElementById('mapSearchResults');
        mapSearchResults.innerHTML = `<div style="padding: 10px; text-align: center; color: red;">
            خطأ في البحث: ${error.message}
        </div>`;
    }
}

// Get weather by coordinates (for map clicks)
async function getWeatherByCoordinates(lat, lon, cityName = null) {
    try {
        showAlert('جاري تحميل بيانات الطقس للموقع المحدد...', 'info');
        
        // Reverse geocode to get city name if not provided
        if (!cityName) {
            const geoResponse = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.OPENWEATHER_API_KEY}`
            );
            
            if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                if (geoData.length > 0) {
                    cityName = geoData[0].name;
                }
            }
        }
        
        // Fetch weather data
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric&lang=ar`
        );
        
        if (!weatherResponse.ok) throw new Error('Weather data fetch failed');
        
        const weatherData = await weatherResponse.json();
        
        // Update current city and coordinates
        currentCity = cityName || weatherData.name;
        currentLat = lat;
        currentLon = lon;
        
        // Update UI
        updateCurrentWeatherUI(weatherData);
        
        // Get forecast for this location
        await getWeatherForecast();
        
        // Update stats
        updateWeatherStats(weatherData);
        
        // Show success
        showAlert(`تم تحميل بيانات الطقس لـ ${weatherData.name}`, 'success');
        
    } catch (error) {
        console.error('Coordinate weather error:', error);
        showAlert(`خطأ في تحميل بيانات الطقس: ${error.message}`, 'error');
    }
}

// Enhanced search with global cities database
async function searchCityGlobally(query) {
    try {
        // First, try OpenWeatherMap geocoding
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.OPENWEATHER_API_KEY}`
        );
        
        if (response.ok) {
            const cities = await response.json();
            
            if (cities.length > 0) {
                return cities.map(city => ({
                    name: city.name,
                    country: city.country,
                    state: city.state,
                    lat: city.lat,
                    lon: city.lon,
                    local_names: city.local_names
                }));
            }
        }
        
        // Fallback to local database for Algerian cities
        const localResults = ALGERIAN_CITIES.filter(city => 
            city.name.includes(query) || 
            city.en.toLowerCase().includes(query.toLowerCase()) ||
            (city.local_names && city.local_names.some(name => 
                name.toLowerCase().includes(query.toLowerCase())))
        );
        
        if (localResults.length > 0) {
            return localResults.map(city => ({
                name: city.name,
                country: 'DZ',
                state: city.state || '',
                lat: city.lat,
                lon: city.lon,
                en: city.en
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error('Global search error:', error);
        return [];
    }
}

// Initialize enhanced search in main search box
function initEnhancedSearch() {
    const searchInput = document.getElementById('searchInput');
    const citySuggestions = document.getElementById('citySuggestions');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', async function(e) {
        clearTimeout(searchTimeout);
        
        const query = this.value.trim();
        if (query.length < 2) {
            citySuggestions.classList.add('hidden');
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                // Show loading
                citySuggestions.innerHTML = '<div class="city-suggestion-item" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</div>';
                citySuggestions.classList.remove('hidden');
                
                // Search globally
                const results = await searchCityGlobally(query);
                
                if (results.length === 0) {
                    citySuggestions.innerHTML = '<div class="city-suggestion-item" style="text-align: center;">لم يتم العثور على مدن مطابقة</div>';
                    return;
                }
                
                // Display results
                let suggestionsHTML = '';
                
                results.forEach(city => {
                    // Get display name
                    let displayName = city.name;
                    if (city.local_names && city.local_names.ar) {
                        displayName = city.local_names.ar;
                    }
                    
                    // Get country name
                    let countryName = city.country;
                    if (city.country === 'DZ') countryName = 'الجزائر';
                    else if (city.country === 'MA') countryName = 'المغرب';
                    else if (city.country === 'TN') countryName = 'تـونس';
                    else if (city.country === 'EG') countryName = 'مصر';
                    else if (city.country === 'SA') countryName = 'السعودية';
                    
                    suggestionsHTML += `
                        <div class="city-suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">
                            <div style="font-weight: bold;">${displayName}</div>
                            <div style="font-size: 12px; color: #666;">
                                ${city.state ? city.state + ', ' : ''}${countryName}
                            </div>
                        </div>
                    `;
                });
                
                citySuggestions.innerHTML = suggestionsHTML;
                
                // Add click events
                citySuggestions.querySelectorAll('.city-suggestion-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const lat = parseFloat(this.dataset.lat);
                        const lon = parseFloat(this.dataset.lon);
                        const cityName = this.dataset.name;
                        
                        // Update search input
                        searchInput.value = this.querySelector('div:first-child').textContent;
                        
                        // Get weather for this city
                        getWeatherByCoordinates(lat, lon, cityName);
                        
                        // Close suggestions
                        citySuggestions.classList.add('hidden');
                    });
                });
                
            } catch (error) {
                console.error('Search error:', error);
                citySuggestions.innerHTML = '<div class="city-suggestion-item" style="text-align: center; color: red;">خطأ في البحث</div>';
            }
        }, 300); // Debounce 300ms
    });
}

// Add CSS for map search
function addMapSearchStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .map-search-control {
            background: white;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            margin-top: 10px !important;
        }
        
        .dark-mode .map-search-control {
            background: #1e293b;
            color: white;
        }
        
        .dark-mode .map-search-control input {
            background: #334155;
            color: white;
            border-color: #475569;
        }
        
        .dark-mode .map-search-control input::placeholder {
            color: #94a3b8;
        }
        
        .dark-mode #mapSearchResults {
            background: #1e293b;
            color: white;
        }
        
        .dark-mode .city-search-result:hover {
            background-color: #334155 !important;
        }
        
        .city-search-result:hover {
            background-color: #f0f8ff !important;
        }
        
        .leaflet-control {
            clear: none !important;
        }
        
        /* تحسين ظهور نتائج البحث في الخريطة */
        .map-search-container {
            position: relative;
        }
        
        #mapSearchResults {
            font-family: 'Cairo', sans-serif;
            text-align: right;
        }
        
        .city-search-result div:first-child {
            color: var(--algeria-green);
            margin-bottom: 3px;
        }
        
        /* تحسين ظهور الاقتراحات في البحث الرئيسي */
        .city-suggestion-item {
            transition: all 0.2s;
            cursor: pointer;
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .dark-mode .city-suggestion-item {
            border-bottom-color: #334155;
        }
        
        .city-suggestion-item:hover {
            background-color: #f1f5f9;
            transform: translateX(-5px);
        }
        
        .dark-mode .city-suggestion-item:hover {
            background-color: #334155;
        }
        
        .city-suggestion-item:last-child {
            border-bottom: none;
        }
        
        .city-suggestion-item div:first-child {
            font-weight: 600;
            color: var(--algeria-green);
            margin-bottom: 3px;
        }
        
        /* زر تحديد الموقع في الخريطة */
        .leaflet-control-locate {
            background: white;
            border-radius: 4px;
            padding: 3px;
        }
        
        .dark-mode .leaflet-control-locate {
            background: #1e293b;
        }
    `;
    document.head.appendChild(style);
}

// Add locate control to map
function addLocateControl() {
    const locateControl = L.control({position: 'topleft'});
    
    locateControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const link = L.DomUtil.create('a', 'leaflet-control-locate', div);
        link.href = '#';
        link.title = 'تحديد موقعي الحالي';
        link.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            getUserLocation();
        });
        
        return div;
    };
    
    locateControl.addTo(map);
}

// Modify initializeApp function to include map search
async function initializeApp() {
    // Show loading state
    showAlert('جاري تحميل بيانات الطقس...', 'info');
    
    // Initialize event listeners
    setupEventListeners();
    
    // Initialize map
    initMap();
    
    // Add map search functionality
    addMapSearchStyles();
    initMapSearch();
    initEnhancedSearch();
    addLocateControl();
    
    // Check API connection
    await checkAPIConnection();
    
    // Get initial weather data
    await getWeatherData(CONFIG.DEFAULT_CITY);
    
    // Get weather forecast
    await getWeatherForecast();
    
    // Get news
    await getWeatherNews();
    
    // Get gallery images
    loadGalleryImages();
    
    // Update time display
    updateCurrentTime();
    
    // Set up auto-refresh
    setInterval(updateCurrentTime, 60000); // Update time every minute
    setInterval(() => getWeatherData(currentCity), 300000); // Refresh weather every 5 minutes
    
    // Add context menu to map for quick actions
    addMapContextMenu();
}

// Add context menu to map
function addMapContextMenu() {
    map.on('contextmenu', function(e) {
        // Create custom context menu
        const menu = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div style="font-family: 'Cairo', sans-serif; text-align: right;">
                    <h4 style="margin: 0 0 10px 0; color: var(--algeria-green);">إجراءات سريعة</h4>
                    <button class="btn" onclick="getWeatherByCoordinates(${e.latlng.lat}, ${e.latlng.lng})" 
                            style="display: block; width: 100%; margin-bottom: 5px; padding: 8px; font-size: 14px;">
                        <i class="fas fa-cloud-sun"></i> عرض الطقس هنا
                    </button>
                    <button class="btn" onclick="addBookmark(${e.latlng.lat}, ${e.latlng.lng}, 'موقع محفوظ')" 
                            style="display: block; width: 100%; margin-bottom: 5px; padding: 8px; font-size: 14px; background: var(--warning-orange);">
                        <i class="fas fa-bookmark"></i> حفظ الموقع
                    </button>
                    <button class="btn" onclick="shareLocation(${e.latlng.lat}, ${e.latlng.lng})" 
                            style="display: block; width: 100%; padding: 8px; font-size: 14px; background: var(--secondary-blue);">
                        <i class="fas fa-share"></i> مشاركة الموقع
                    </button>
                </div>
            `)
            .openOn(map);
    });
}

// Bookmark location function
function addBookmark(lat, lon, name) {
    const bookmarks = JSON.parse(localStorage.getItem('weatherBookmarks') || '[]');
    
    // Check if already bookmarked
    const exists = bookmarks.some(b => b.lat === lat && b.lon === lon);
    
    if (!exists) {
        bookmarks.push({
            lat: lat,
            lon: lon,
            name: name || `موقع محفوظ ${bookmarks.length + 1}`,
            date: new Date().toISOString()
        });
        
        localStorage.setItem('weatherBookmarks', JSON.stringify(bookmarks));
        showAlert('تم حفظ الموقع في المفضلة', 'success');
    } else {
        showAlert('الموقع محفوظ مسبقاً', 'warning');
    }
}

// Share location function
function shareLocation(lat, lon) {
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'موقع في خريطة الطقس',
            text: 'اطلع على حالة الطقس في هذا الموقع',
            url: url
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showAlert('تم نسخ رابط الموقع إلى الحافظة', 'success');
        });
    }
}

// Load bookmarked locations on map
function loadBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('weatherBookmarks') || '[]');
    
    bookmarks.forEach(bookmark => {
        const marker = L.marker([bookmark.lat, bookmark.lon]).addTo(map);
        
        marker.bindPopup(`
            <strong>${bookmark.name}</strong><br>
            <small>${new Date(bookmark.date).toLocaleDateString('ar-EG')}</small><br>
            <button class="btn" onclick="getWeatherByCoordinates(${bookmark.lat}, ${bookmark.lon}, '${bookmark.name}')"
                    style="padding: 5px 10px; margin-top: 5px; font-size: 12px;">
                عرض الطقس
            </button>
            <button class="btn" onclick="removeBookmark(${bookmark.lat}, ${bookmark.lon})"
                    style="padding: 5px 10px; margin-top: 5px; font-size: 12px; background: var(--alert-red);">
                حذف
            </button>
        `);
    });
}

// Remove bookmark
function removeBookmark(lat, lon) {
    let bookmarks = JSON.parse(localStorage.getItem('weatherBookmarks') || '[]');
    bookmarks = bookmarks.filter(b => !(b.lat === lat && b.lon === lon));
    localStorage.setItem('weatherBookmarks', JSON.stringify(bookmarks));
    showAlert('تم حذف الموقع من المفضلة', 'success');
    location.reload(); // Refresh to update map
}

// Call this in initializeApp
async function initializeApp() {
    // ... existing code ...
    
    // Load bookmarks
    loadBookmarks();
    
    // ... existing code ...
}
</script>