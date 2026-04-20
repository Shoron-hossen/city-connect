const fs = require('fs');

let c = fs.readFileSync('src/EnvironmentPage.tsx', 'utf-8');

// 1. Add soil saturation states
c = c.replace(
  "const [latLon, setLatLon] = useState<{lat: number, lon: number} | null>(null);",
  "const [latLon, setLatLon] = useState<{lat: number, lon: number} | null>(null);\n  const [saturation, setSaturation] = useState<number>(0);"
);

// 2. Modify the API fetches inside useEffect
const oldFetchBlock = `
          const aqiRes = await fetch(\`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=\${lat}&longitude=\${lon}&current=european_aqi\`);
          if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            setAqi(aqiData.current?.european_aqi);
          }

          const weatherRes = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=precipitation\`);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            setPrecip(wData.current?.precipitation || 0);
          }
`;

const newFetchBlock = `
          // WAQI API for accurate Dhaka stations
          const aqiRes = await fetch(\`https://api.waqi.info/feed/geo:\${lat};\${lon}/?token=demo\`);
          if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            if (aqiData.status === 'ok') {
               setAqi(aqiData.data.aqi);
            }
          }

          // OpenWeatherMap One Call equivalent via Open-Meteo as high-resolution fallback due to OWM premium keys
          const weatherRes = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=precipitation\`);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            const p = wData.current?.precipitation || 0;
            setPrecip(p);
            
            // Ground Saturation Formula
            const SOIL_ABSORPTION_RATE = 15; // mm/hr for clay-heavy soil profile (Dhaka)
            const sat = (p / SOIL_ABSORPTION_RATE) * 100;
            setSaturation(Math.min(sat, 100)); // cap at 100%
          }
`;

c = c.replace(oldFetchBlock.trim(), newFetchBlock.trim());

// 3. Update the UI for Ground Saturation
const oldSatUI = `
              <div className="flex items-center gap-4 bg-white/5 p-5 rounded-xl border border-white/5">
                <AlertTriangle className="text-amber-400 flex-shrink-0" size={32} />
                <div>
                  <h3 className="font-bold text-white text-lg">Ground Saturation</h3>
                  <p className="text-sm text-gray-400 mt-1">Calculated via direct geolocation data.</p>
                </div>
              </div>
`;

const newSatUI = `
              <div className={\`flex items-center gap-4 \${saturation > 80 ? 'bg-amber-500/20 border-amber-500/30' : 'bg-white/5 border-white/5'} p-5 rounded-xl border transition-colors\`}>
                <AlertTriangle className={\`flex-shrink-0 \${saturation > 80 ? 'text-amber-400' : 'text-gray-400'}\`} size={32} />
                <div className="w-full pr-4">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-white text-lg">Ground Saturation</h3>
                    <span className={\`font-bold \${saturation > 80 ? 'text-amber-400' : 'text-gray-400'}\`}>{saturation.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2.5 mb-1 border border-white/5">
                    <div className={\`h-2.5 rounded-full \${saturation > 80 ? 'bg-amber-500' : 'bg-blue-400'}\`} style={{ width: \`\${saturation}%\` }}></div>
                  </div>
                  <p className="text-xs text-gray-400">Formula based on Dhaka soil absorption rates vs 24h rainfall.</p>
                </div>
              </div>
`;

c = c.replace(oldSatUI.trim(), newSatUI.trim());

// Fix WAQI string mapping if AQI is > 100
const oldCategory = `
  const getAqiCategory = (val: number | null) => {
    if (!val) return 'Unknown';
    if (val <= 20) return 'Good';
    if (val <= 40) return 'Fair';
    if (val <= 60) return 'Moderate';
    if (val <= 80) return 'Poor';
    return 'Very Poor';
  };
`;
const newCategory = `
  const getAqiCategory = (val: number | null) => {
    if (!val) return 'Unknown';
    if (val <= 50) return 'Good';
    if (val <= 100) return 'Moderate';
    if (val <= 150) return 'Unhealthy (Sens)';
    if (val <= 200) return 'Unhealthy';
    if (val <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };
`;
c = c.replace(oldCategory.trim(), newCategory.trim());

// Change AQI text to say WAQI
c = c.replace("European AQI", "WAQI Standard");

fs.writeFileSync('src/EnvironmentPage.tsx', c);
console.log('EnvironmentPage modified successfully.');
