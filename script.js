// API Configuration
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Получить на https://openweathermap.org/api
const BASE_URL = 'https://api.openweathermap.org';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const weatherContent = document.getElementById('weatherContent');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Initialize
window.addEventListener('load', () => {
    const savedCity = localStorage.getItem('lastCity');
    if (savedCity) {
        cityInput.value = savedCity;
        handleSearch();
    } else {
        // Использовать геолокацию по умолчанию
        getWeatherByGeolocation();
    }
});

/**
 * Обработка поиска города
 */
async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Пожалуйста, введите название города');
        return;
    }
    
    localStorage.setItem('lastCity', city);
    await getWeatherByCity(city);
}

/**
 * Получить погоду по названию города
 */
async function getWeatherByCity(city) {
    try {
        showLoading(true);
        hideError();

        // Получить координаты города
        const geoResponse = await fetch(
            `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        );
        
        if (!geoResponse.ok) throw new Error('Город не найден');
        const geoData = await geoResponse.json();
        
        if (geoData.length === 0) throw new Error('Город не найден');
        
        const { lat, lon, name, country } = geoData[0];
        
        // Получить погоду по координатам
        await getWeatherByCoordinates(lat, lon, `${name}, ${country}`);
    } catch (error) {
        showError(error.message || 'Ошибка при получении данных о погоде');
        showLoading(false);
    }
}

/**
 * Получить погоду по координатам
 */
async function getWeatherByCoordinates(lat, lon, cityName) {
    try {
        showLoading(true);
        hideError();

        // Текущая погода
        const weatherResponse = await fetch(
            `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&lang=ru&units=metric&appid=${API_KEY}`
        );
        
        // Прогноз на 5 дней
        const forecastResponse = await fetch(
            `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&lang=ru&units=metric&appid=${API_KEY}`
        );

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error('Ошибка при получении данных');
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        displayCurrentWeather(weatherData, cityName);
        displayForecast(forecastData);
        displayHourlyForecast(forecastData);
        showLoading(false);
    } catch (error) {
        showError(error.message || 'Ошибка при получении данных о погоде');
        showLoading(false);
    }
}

/**
 * Получить погоду по геолокации
 */
async function getWeatherByGeolocation() {
    if (!navigator.geolocation) {
        console.log('Геолокация не поддерживается');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            getWeatherByCoordinates(latitude, longitude, 'Текущее местоположение');
        },
        (error) => {
            console.log('Ошибка геолокации:', error);
        }
    );
}

/**
 * Отобразить текущую погоду
 */
function displayCurrentWeather(data, cityName) {
    const { main, weather, wind, clouds, visibility, sys } = data;
    const icon = `https://openweathermap.org/img/wn/${weather[0].icon}@4x.png`;
    const sunrise = new Date(sys.sunrise * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(sys.sunset * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('cityName').textContent = cityName;
    document.getElementById('temperature').textContent = Math.round(main.temp);
    document.getElementById('description').textContent = weather[0].description;
    document.getElementById('feelsLike').textContent = `Ощущается как ${Math.round(main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${(wind.speed * 3.6).toFixed(1)} км/ч`;
    document.getElementById('pressure').textContent = `${main.pressure} гПа`;
    document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} км`;
    document.getElementById('weatherIcon').src = icon;
    document.getElementById('lastUpdate').textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;

    weatherContent.style.display = 'block';
}

/**
 * Отобразить прогноз на 5 дней
 */
function displayForecast(data) {
    const container = document.getElementById('forecastContainer');
    container.innerHTML = '';

    // Группировать по дням
    const dailyForecasts = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('ru-RU');
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = item;
        }
    });

    Object.entries(dailyForecasts).slice(0, 5).forEach(([date, item]) => {
        const { main, weather } = item;
        const icon = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
        const dateObj = new Date(item.dt * 1000);
        const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', month: 'numeric', day: 'numeric' });

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">${dayName}</div>
            <img src="${icon}" alt="Weather" class="forecast-icon">
            <div class="forecast-temp">${Math.round(main.temp)}°C</div>
            <div class="forecast-temp-min">Мин: ${Math.round(main.temp_min)}°C</div>
            <div class="forecast-description">${weather[0].description}</div>
        `;
        container.appendChild(card);
    });
}

/**
 * Отобразить почасовой прогноз
 */
function displayHourlyForecast(data) {
    const container = document.getElementById('hourlyContainer');
    container.innerHTML = '';

    data.list.slice(0, 12).forEach(item => {
        const { main, weather } = item;
        const icon = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
        const time = new Date(item.dt * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="hourly-time">${time}</div>
            <img src="${icon}" alt="Weather" class="hourly-icon">
            <div class="hourly-temp">${Math.round(main.temp)}°C</div>
            <div class="hourly-condition">${weather[0].description}</div>
        `;
        container.appendChild(card);
    });
}

/**
 * Вспомогательные функции UI
 */
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
    weatherContent.style.display = show ? 'none' : 'block';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    weatherContent.style.display = 'none';
    loadingSpinner.style.display = 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Автоматическое обновление каждые 30 минут
setInterval(() => {
    const city = localStorage.getItem('lastCity');
    if (city) handleSearch();
}, 30 * 60 * 1000);