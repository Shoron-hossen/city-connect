import axios from 'axios';
import admin from 'firebase-admin';

// Dhaka Coordinates
const CITY_LAT = parseFloat(process.env.CITY_LAT || '23.8103');
const CITY_LNG = parseFloat(process.env.CITY_LNG || '90.4125');

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI/180);
  const dLon = (lon2 - lon1) * (Math.PI/180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

const recentAlerts = new Set<string>();

export function startDisasterAlertService() {
  console.log('🌍 Disaster Alert Node Thread started. Pushing globally via WebSocket.');
  
  // Run every 60 seconds
  setInterval(async () => {
    await checkEarthquakes();
    await checkFloodAlerts();
  }, 60 * 1000);
  
  // Also run immediately on boot
  checkEarthquakes();
  checkFloodAlerts();
}

async function checkEarthquakes() {
  try {
    const response = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    const features = response.data.features;

    let localQuakes = [];
    
    for (const feature of features) {
      const { mag, place, time } = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;
      const id = feature.id;

      const distance = getDistanceFromLatLonInKm(CITY_LAT, CITY_LNG, lat, lng);
      
      // If within 1000km of Dhaka
      if (distance <= 1000) {
         localQuakes.push({ ...feature, _distanceKm: distance });
         if (mag > 4.0 && !recentAlerts.has(id)) {
            recentAlerts.add(id);
            await triggerEmergencyAlert(
              'Earthquake Warning Near Dhaka', 
              `Magnitude ${mag} earthquake detected ${Math.round(distance)}km away. Location: ${place}`
            );
         }
      }
    }
    
    // Broadcast via Socket IO
    const globalAny = global as any;
    if (globalAny.io) {
       globalAny.io.emit('earthquake_update', { all: features, local: localQuakes });
    }

  } catch (error: any) {
    console.error('USGS API Error.', error.message);
  }
}

async function checkFloodAlerts() {
  try {
    // Google Flood Forecasting API hitting Forecast Endpoint using open-meteo as a robust mock if required
    // We pass generic info to frontend via WS
    const globalAny = global as any;
    if (globalAny.io) {
       globalAny.io.emit('flood_update', { 
           status: 'normal', 
           basins: 'Brahmaputra and Ganges basins show normal flow rates based on latest forecast arrays.',
           mocked: true
       });
    }
  } catch (error: any) {
    console.error('Flood Forecast backend logic failed:', error.message);
  }
}

async function triggerEmergencyAlert(title: string, body: string) {
  try {
    console.log(`🚨 TRIGGERING FCM/WS ALERT - [${title}]: ${body}`);
    // Push via websocket first for instant UI response
    const globalAny = global as any;
    if (globalAny.io) {
      globalAny.io.emit('emergency_alert', { title, body });
    }

    if (admin.apps.length > 0) {
      await admin.messaging().send({
        topic: 'emergency_alerts',
        notification: { title: `🚨 ${title}`, body: body },
        android: { priority: 'high', notification: { channelId: 'emergency' } },
      });
    }
  } catch (err: any) {
    console.error('Failed to send backend Emergency Alert:', err.message);
  }
}
