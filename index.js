// ===== State =====
let cities = [];
var oncall = false;
var decision = false;

fetch("cities.json")
    .then((res) => res.json())
    .then((data) => {
        cities = data;
    })
    .catch((err) => {
        console.error("Failed to load cities.json. Make sure the file exists and you are running via a local server.", err);
        cities = [
          { city: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
          { city: "New York", country: "USA", lat: 40.7128, lng: -74.0060 },
          { city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 }
        ];
    });

const input = document.getElementById("city");
const display = document.getElementById("display");
const suggestionsBox = document.getElementById("suggestions");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const countryInput = document.getElementById("country");
const chatlog = document.querySelector(".chatlog"); 

// ===== UI Enhancements =====
function setStatus(state) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const sub = document.getElementById("chatSub");
  const handset = document.getElementById("handset");

  dot.classList.remove("ringing", "connected");
  handset.classList.remove("lifted", "ringing");

  if (state === "idle") {
    text.textContent = "Idle";
    text.style.color = "var(--success)";
    sub.innerHTML = 'No active call · Dial a number to begin';
  } else if (state === "dialing") {
    text.textContent = "Dialing";
    text.style.color = "var(--accent-glow)";
    dot.classList.add("ringing");
    handset.classList.add("ringing");
    sub.innerHTML = 'Dialing...';
  } else if (state === "connected") {
    text.textContent = "Connected";
    text.style.color = "var(--success)";
    dot.classList.add("connected");
    handset.classList.add("lifted");
    sub.innerHTML = 'Call connected';
  }
}

function clearEmptyState() {
  const empty = document.getElementById("chatEmpty");
  if (empty) empty.remove();
}

// ===== User's JS Logic (Modified to use insertAdjacentHTML to prevent flickering) =====
function showMessage(header, message){
  clearEmptyState();
  const html = `
  <div class="chatbox">
      <div class="dialog-box">
          <h3>${header}</h3>
          <p>${message}</p>
          <p class="current-time">${new Date().toLocaleTimeString()}</p>
      </div>
  </div>`;
  chatlog.insertAdjacentHTML('beforeend', html);
  chatlog.scrollTop = chatlog.scrollHeight;
}

async function dial(number){
  if(!oncall){
      display.textContent += number;
  }
  else if(oncall && decision){
      if(number === "1"){
          decision = false;
          display.textContent = number;
          await delay(1000);
          showMessage("Weather Station", "Fetching current weather...");

          await delay(2000);
          await showCurrentWeather();

          await delay(1000);
          showMessage("Weather Station", "Anything else? For getting current weather, press 1, for 5-day forecast, press 2, for exit, press 0.");
          display.textContent = "Choosing...";
          decision = true;
      }
      if(number === "2"){
          decision = false;
          display.textContent = number;
          await delay(1000);
          showMessage("Weather Station", "Fetching 5-day weather forecast...");

          await delay(2000);
          await showWeather5Day3Hour();

          await delay(1000);
          showMessage("Weather Station", "Anything else? For getting current weather, press 1, for 5-day forecast, press 2, for exit, press 0.");
          display.textContent = "Choosing...";
          decision = true;
      }
      if(number === "0"){
          display.textContent = "";
          oncall = false;
          decision = false;
          setStatus("idle");
          showMessage("Weather Station", "Thank you for calling the weather station. Goodbye!");
      }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callNumber() {
  if (oncall) return;
  
  clearEmptyState();
  oncall = true;
  const dialed = display.textContent;
  setStatus("dialing");
  
  if (dialed === "717045") {
      display.textContent = "Weather...";
      await delay(2000);
      setStatus("connected");
      showMessage("Weather Station", "Hello and thank you for calling the weather station.");
      
      await delay(2000);
      showMessage("Weather Station", "For getting current weather, press 1, for 5-day forecast, press 2, for exit, press 0.");

      await delay(2000);
      decision = true;
      display.textContent = "Choosing...";
  } 
  else if (dialed === "911") {
      display.textContent = "Operator...";
      await delay(2000);
      setStatus("connected");
      
      const country = countryInput.value || "UK";
      let emergencyNum = "112"; // Default EU
      if (country === "USA" || country === "Canada") emergencyNum = "911";
      else if (country === "UK" || country === "Ireland") emergencyNum = "999 or 112";
      else if (country === "Australia") emergencyNum = "000";
      else if (country === "Japan") emergencyNum = "110 (Police) or 119 (Ambulance/Fire)";
      
      showMessage("Operator", `Hello, you are connected to the international switchboard.`);
      await delay(2000);
      showMessage("Operator", `I see your location is set to ${country}. In your region, the local emergency number is ${emergencyNum}. Please hang up and dial that number immediately.`);
      await delay(3000);
      hangup();
  }
  else if (dialed === "68790") {
      display.textContent = "Time/Temp...";
      await delay(1500);
      setStatus("connected");
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      let tempData = await getCurrentWeather(); 
      
      showMessage("Time & Temp", `At the tone, the time will be ${timeStr}. The current temperature is ${tempData.main.temp} degrees Celsius.`);
      await delay(4000);
      hangup();
  }
  else {
      display.textContent = "NO CALL...";
      oncall = false;
      setStatus("idle");
      await delay(1500);
      display.textContent = "";
  }
}

// ===== Open-Meteo API Integration =====
function mapWeatherCode(code, isDay = true) {
  const map = {
    0:  { icon: isDay ? "01d" : "01n", description: "clear sky" },
    1:  { icon: isDay ? "02d" : "02n", description: "mainly clear" },
    2:  { icon: isDay ? "03d" : "03n", description: "partly cloudy" },
    3:  { icon: isDay ? "04d" : "04n", description: "overcast" },
    45: { icon: "50d", description: "fog" },
    48: { icon: "50d", description: "depositing rime fog" },
    51: { icon: "09d", description: "light drizzle" },
    53: { icon: "09d", description: "moderate drizzle" },
    55: { icon: "09d", description: "dense drizzle" },
    56: { icon: "09d", description: "light freezing drizzle" },
    57: { icon: "09d", description: "dense freezing drizzle" },
    61: { icon: "10d", description: "slight rain" },
    63: { icon: "10d", description: "moderate rain" },
    65: { icon: "10d", description: "heavy rain" },
    66: { icon: "10d", description: "light freezing rain" },
    67: { icon: "10d", description: "heavy freezing rain" },
    71: { icon: "13d", description: "slight snow" },
    73: { icon: "13d", description: "moderate snow" },
    75: { icon: "13d", description: "heavy snow" },
    77: { icon: "13d", description: "snow grains" },
    80: { icon: "09d", description: "slight rain showers" },
    81: { icon: "09d", description: "moderate rain showers" },
    82: { icon: "09d", description: "violent rain showers" },
    85: { icon: "13d", description: "slight snow showers" },
    86: { icon: "13d", description: "heavy snow showers" },
    95: { icon: "11d", description: "thunderstorm" },
    96: { icon: "11d", description: "thunderstorm with slight hail" },
    99: { icon: "11d", description: "thunderstorm with heavy hail" },
  };
  return map[code] || { icon: "01d", description: "unknown" };
}

async function getCurrentWeather() {
  const lat = latInput.value || 51.5074;
  const lng = lngInput.value || -0.1278;

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`
  );
  const data = await res.json();

  const wmoCode = data.current.weather_code;
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 19;
  const { icon, description } = mapWeatherCode(wmoCode, isDay);

  return {
    dt: Math.floor(Date.now() / 1000),
    weather: [{ icon, description }],
    main: { temp: Math.round(data.current.temperature_2m) },
  };
}

async function getWeather5Day3Hour() {
  const lat = latInput.value || 51.5074;
  const lng = lngInput.value || -0.1278;

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&forecast_days=5&timezone=auto`
  );
  const data = await res.json();

  const list = [];
  for (let i = 0; i < data.hourly.time.length; i += 3) {
    if (list.length >= 40) break;

    const dt = new Date(data.hourly.time[i]).getTime() / 1000;
    const wmoCode = data.hourly.weather_code[i];
    const dateObj = new Date(data.hourly.time[i]);
    const hour = dateObj.getHours();
    const isDay = hour >= 6 && hour < 19;
    const { icon, description } = mapWeatherCode(wmoCode, isDay);

    list.push({
      dt,
      weather: [{ icon, description }],
      main: { temp: Math.round(data.hourly.temperature_2m[i]) },
    });
  }
  return { list };
}

async function showCurrentWeather(){
  try {
    let weatherData = await getCurrentWeather();
    let timestamp = weatherData.dt;
    let date = new Date(timestamp * 1000);

    let dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' }); 
    let timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); 
    
    let iconUrl = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
    
    const html = `
    <div class="chatbox">
        <div class="dialog-box">
            <h3>Weather Station</h3>
        </div>
        <div class="weatherbox">
            <div class="weather-left">
                <p class="date">${dateStr}</p>
                <p class="time">${timeStr}</p>
            </div>
            <div class="weather-right">
                <img src="${iconUrl}" alt="${weatherData.weather[0].description}" class="weather-icon">
                <p class="weather-desc">${weatherData.weather[0].description}</p>
                <p class="temperature">${weatherData.main.temp}°C</p>
            </div>
        </div>
        <p class="current-time">${new Date().toLocaleTimeString()}</p>
    </div>`;
    chatlog.insertAdjacentHTML('beforeend', html);
    chatlog.scrollTop = chatlog.scrollHeight;
  } catch (e) {
    showMessage("Weather Station", "Sorry, we couldn't fetch the weather data. Please try again.");
  }
}

async function showWeather5Day3Hour() {
  try {
    let weatherData = await getWeather5Day3Hour();

    let chatboxHTML = `
    <div class="chatbox">
        <div class="dialog-box">
            <h3>Weather Station</h3>
        </div>
        <div class="forecast-scroll">
    `;
    
    for (let i = 0; i < weatherData.list.length; i++) {
        let forecast = weatherData.list[i];
        let timestamp = forecast.dt;
        let date = new Date(timestamp * 1000);

        let dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });
        let timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        let iconUrl = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png`;

        chatboxHTML += `
        <div class="weatherbox">
            <div class="weather-left">
                <p class="date">${dateStr}</p>
                <p class="time">${timeStr}</p>
            </div>
            <div class="weather-right">
                <img src="${iconUrl}" alt="${forecast.weather[0].description}" class="weather-icon">
                <p class="weather-desc">${forecast.weather[0].description}</p>
                <p class="temperature">${Math.round(forecast.main.temp)}°C</p>
            </div>
        </div>`;
    }

    chatboxHTML += `
        </div>
        <p class="current-time">${new Date().toLocaleTimeString()}</p>
    </div>`;
    
    chatlog.insertAdjacentHTML('beforeend', chatboxHTML);
    chatlog.scrollTop = chatlog.scrollHeight;
  } catch (e) {
    showMessage("Weather Station", "Sorry, we couldn't fetch the forecast data. Please try again.");
  }
}

function clearDisplay(){
  oncall = false;
  decision = false;
  display.textContent = "";
  setStatus("idle");
}

function hangup(){
  oncall = false;
  decision = false;
  display.textContent = "";
  setStatus("idle");
}

// ===== Event Listeners =====
input.addEventListener("input", () => {
  const query = input.value.trim().toLowerCase();
  suggestionsBox.innerHTML = ""; 

  if (query.length === 0) {
    suggestionsBox.classList.remove("visible");
    return;
  }

  const matches = cities
    .filter((c) => c.city.toLowerCase().startsWith(query))
    .slice(0, 10); 

  if (matches.length === 0) {
    suggestionsBox.classList.remove("visible");
    return;
  }

  suggestionsBox.classList.add("visible");

  matches.forEach((match) => {
    const item = document.createElement("div");
    item.classList.add("suggestion-item");
    item.innerHTML = `<span>${match.city}</span><span class="flag">${match.country}</span>`;

    item.addEventListener("click", () => {
      input.value = `${match.city}, ${match.country}`;
      latInput.value = match.lat;
      lngInput.value = match.lng;
      countryInput.value = match.country; // Save country for 911 logic
      suggestionsBox.innerHTML = ""; 
      suggestionsBox.classList.remove("visible");
    });

    suggestionsBox.appendChild(item);
  });
});

document.addEventListener("click", (e) => {
  if (e.target !== input && !suggestionsBox.contains(e.target)) {
    suggestionsBox.classList.remove("visible");
  }
});

// Tab Switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`[data-content="${target}"]`).classList.add("active");
  });
});

// Keypad Listeners
document.querySelectorAll(".key").forEach((key) => {
  key.addEventListener("click", () => {
    const k = key.dataset.key;
    dial(k);
    key.classList.add("pressed");
    setTimeout(() => key.classList.remove("pressed"), 100);
  });
});

// Clicking Yellow Pages entry auto-fills the number
document.querySelectorAll(".entry").forEach((entry) => {
  entry.addEventListener("click", () => {
    if (!oncall) {
      display.textContent = entry.dataset.num;
    }
  });
});

// Keyboard support
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (/^[0-9*#]$/.test(e.key)) {
    const key = document.querySelector(`.key[data-key="${e.key}"]`);
    if (key) key.click();
  } else if (e.key === "Enter") {
    callNumber();
  } else if (e.key === "Escape") {
    hangup();
  }
});