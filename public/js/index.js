// Fetch Air Quality Index data
async function fetchAQIData(lat, lon) {
    try {
        const response = await fetch(`/api/aqi?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        const components = data.list[0].components;

        $('#co').text('CO');
        $('#coValue').text(components.co);
        $('#so2').text('SO2');
        $('#so2Value').text(components.so2);
        $('#o3').text('O3');
        $('#o3Value').text(components.o3);
        $('#no2').text('NO2');
        $('#no2Value').text(components.no2);
    } catch (error) {
        console.error("Failed to fetch AQI data:", error);
    }
}

// Fetch and display next 5 days forecast
async function nextFiveDays(lat, lon) {
    try {
        const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
        const data = await response.json();

        const dailyData = {};
        data.list.forEach(item => {
            const date = item.dt_txt.split(" ")[0];
            if (!dailyData[date]) {
                dailyData[date] = {
                    temp: item.main.temp.toFixed(1),
                    icon: item.weather[0].icon,
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
                };
            }
        });

        const forecastHtml = Object.keys(dailyData).slice(0, 5).map(date => {
            const item = dailyData[date];
            return `
                <div class="forecastRow">
                    <h6>${item.day}</h6>
                    <img src="https://openweathermap.org/img/wn/${item.icon}@2x.png" width="40px" />
                    <h6>${item.temp} &deg;C</h6>
                    <small>${date}</small>
                </div>`;
        }).join("");

        document.getElementById("forecastContainer").innerHTML = forecastHtml;
    } catch (error) {
        console.error("Failed to load 5-day forecast:", error);
    }
}

// Display hourly temperatures for today (and fill with tomorrow if needed)
async function todayTemps(lat, lon) {
    try {
        const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
        const data = await response.json();

        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

        let todayData = data.list.filter(item => item.dt_txt.startsWith(today));
        let tomorrowData = data.list.filter(item => item.dt_txt.startsWith(tomorrow));

        let selected = todayData.slice(0, 6);
        if (selected.length < 6) {
            selected = selected.concat(tomorrowData.slice(0, 6 - selected.length));
        }

        const html = selected.map(item => {
            const time = new Date(item.dt_txt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            const temp = item.main.temp.toFixed(1);
            const icon = item.weather[0].icon;
            return `
                <div class="todayTemp">
                    <h6 class="m-0">${time}</h6>
                    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" width="50px" alt="icon">
                    <h5>${temp}&deg;C</h5>
                </div>`;
        }).join("");

        document.getElementById("todayTempContainer").innerHTML = html;
    } catch (error) {
        console.error("Failed to fetch today's forecast:", error);
    }
}

// Main weather + AQI fetch by city name
async function fetchData() {
    const city = document.querySelector('.inputfield').value.trim();
    if (!city) return alert("Please enter a city name");

    try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const data = await response.json();

        // Show the actual error message from the server if present
        if (!data || (data.cod && data.cod !== 200)) {
            alert(data.error || "City not found or API failed.");
            return;
        }
        if (!data.name || !data.main || !data.weather || !data.coord) {
            alert(data.error || "City not found or API failed.");
            return;
        }

        updateUI(data);
    } catch (error) {
        console.error("Failed to fetch weather data:", error);
        alert("City not found or API failed.");
    }
}

// Update UI with weather data
async function updateUI(data) {
    $('#cityName').text(data.name);
    $('#cityTemp').text(Math.round(data.main.temp));
    $('#skyDisc').text(data.weather[0].description);
    $('#feelsLikeVal').text(`${data.main.feels_like} °C`);
    $('#humidityVal').text(`${data.main.humidity} %`);
    $('#pressureVal').text(`${data.main.pressure} hPa`);
    $('#visibilityVal').text(`${data.visibility} m`);
    $('#windSpeed').text(`${data.wind.speed} m/s`);

    const now = new Date();
    $('#date').text(now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }));
    $('#time').text(now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));

    const formatUnixTime = unix => new Date(unix * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    $('#sunriseTime').text(formatUnixTime(data.sys.sunrise));
    $('#sunsetTime').text(formatUnixTime(data.sys.sunset));

    const { lat, lon } = data.coord;
    await fetchAQIData(lat, lon);
    await nextFiveDays(lat, lon);
    await todayTemps(lat, lon);
}

// Event listeners
document.querySelector('.searchBtn')?.addEventListener('click', fetchData);
document.querySelector('.searchIcon')?.addEventListener('click', fetchData);

// Allow Enter key to trigger search
document.querySelector('.inputfield')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') fetchData();
});

document.querySelector('.locationBtn')?.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
            // Corrected API endpoint to use lat/lon
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
            const data = await response.json();
            document.querySelector('.inputfield').value = data.name;
            updateUI(data);
        } catch (err) {
            console.error("Location fetch failed:", err);
            alert("Failed to get location-based weather");
        }
    });
});
