/**
 * Real Indian Cities Data
 * 4-8 cities per state with lat/lon coordinates
 * Used by export_city_stream.py and city-level visualizations
 */

export interface CityInfo {
  name: string;
  lat: number;
  lon: number;
}

export const CITIES_BY_STATE: Record<string, CityInfo[]> = {
  // Northern Region
  Delhi: [
    { name: "New Delhi", lat: 28.6139, lon: 77.209 },
    { name: "Delhi Cantonment", lat: 28.5665, lon: 77.1894 },
    { name: "Noida", lat: 28.5921, lon: 77.3269 },
    { name: "Dwarka", lat: 28.5928, lon: 77.0449 },
  ],
  Haryana: [
    { name: "Gurgaon", lat: 28.4595, lon: 77.0266 },
    { name: "Faridabad", lat: 28.4089, lon: 77.3178 },
    { name: "Hisar", lat: 29.1489, lon: 75.7237 },
    { name: "Rohtak", lat: 28.8955, lon: 76.5648 },
  ],
  Punjab: [
    { name: "Amritsar", lat: 31.634, lon: 74.8723 },
    { name: "Ludhiana", lat: 30.901, lon: 75.8573 },
    { name: "Chandigarh", lat: 30.7333, lon: 76.7794 },
    { name: "Jalandhar", lat: 31.7256, lon: 75.5797 },
  ],
  Rajasthan: [
    { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
    { name: "Jodhpur", lat: 26.2389, lon: 73.0243 },
    { name: "Udaipur", lat: 24.5854, lon: 73.7125 },
    { name: "Kota", lat: 25.2138, lon: 75.8648 },
    { name: "Ajmer", lat: 26.4499, lon: 74.6399 },
  ],
  "Uttar Pradesh": [
    { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
    { name: "Kanpur", lat: 26.4499, lon: 80.3319 },
    { name: "Agra", lat: 27.1767, lon: 78.0081 },
    { name: "Varanasi", lat: 25.352, lon: 82.9856 },
    { name: "Allahabad", lat: 25.4358, lon: 81.8463 },
    { name: "Ghaziabad", lat: 28.6692, lon: 77.4538 },
  ],
  Uttarakhand: [
    { name: "Dehradun", lat: 30.3165, lon: 78.0322 },
    { name: "Haridwar", lat: 29.9457, lon: 78.1642 },
    { name: "Rishikesh", lat: 30.0889, lon: 78.268 },
    { name: "Almora", lat: 29.5943, lon: 79.647 },
  ],
  "Himachal Pradesh": [
    { name: "Shimla", lat: 31.7774, lon: 77.1281 },
    { name: "Mandi", lat: 32.2387, lon: 76.927 },
    { name: "Solan", lat: 30.9047, lon: 77.1651 },
    { name: "Kangra", lat: 32.2171, lon: 76.2589 },
  ],
  "Jammu and Kashmir": [
    { name: "Srinagar", lat: 34.0837, lon: 74.7973 },
    { name: "Jammu", lat: 32.7273, lon: 74.8479 },
    { name: "Leh", lat: 34.1526, lon: 77.5771 },
    { name: "Kargil", lat: 34.5515, lon: 76.1137 },
  ],
  Ladakh: [
    { name: "Leh", lat: 34.1526, lon: 77.5771 },
    { name: "Kargil", lat: 34.5515, lon: 76.1137 },
  ],
  Chandigarh: [{ name: "Chandigarh", lat: 30.7333, lon: 76.7794 }],

  // Western Region
  Maharashtra: [
    { name: "Mumbai", lat: 19.076, lon: 72.8777 },
    { name: "Pune", lat: 18.5204, lon: 73.8567 },
    { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
    { name: "Aurangabad", lat: 19.8762, lon: 75.3433 },
    { name: "Nashik", lat: 19.9975, lon: 73.7898 },
    { name: "Solapur", lat: 17.6599, lon: 75.9064 },
  ],
  Gujarat: [
    { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
    { name: "Surat", lat: 21.1702, lon: 72.8311 },
    { name: "Vadodara", lat: 22.3072, lon: 73.1812 },
    { name: "Rajkot", lat: 22.3039, lon: 70.8022 },
    { name: "Gandhinagar", lat: 23.2156, lon: 72.6369 },
  ],
  "Madhya Pradesh": [
    { name: "Indore", lat: 22.7196, lon: 75.8577 },
    { name: "Bhopal", lat: 23.1815, lon: 79.9864 },
    { name: "Gwalior", lat: 26.2183, lon: 78.1629 },
    { name: "Jabalpur", lat: 23.1815, lon: 79.9864 },
  ],
  Chhattisgarh: [
    { name: "Raipur", lat: 21.2514, lon: 81.6296 },
    { name: "Bhilai", lat: 21.214, lon: 81.4048 },
    { name: "Bilaspur", lat: 22.0796, lon: 82.1581 },
    { name: "Durg", lat: 21.1891, lon: 81.2853 },
  ],
  Goa: [
    { name: "Panaji", lat: 15.4909, lon: 73.8278 },
    { name: "Margao", lat: 15.2993, lon: 73.9537 },
    { name: "Vasco da Gama", lat: 15.3867, lon: 73.8245 },
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    { name: "Silvassa", lat: 20.1809, lon: 73.7997 },
    { name: "Daman", lat: 20.4283, lon: 72.8479 },
  ],

  // Southern Region
  "Andhra Pradesh": [
    { name: "Visakhapatnam", lat: 17.6869, lon: 83.2185 },
    { name: "Vijayawada", lat: 16.5062, lon: 80.648 },
    { name: "Tirupati", lat: 13.1939, lon: 79.8711 },
    { name: "Nellore", lat: 14.4426, lon: 79.9864 },
  ],
  Telangana: [
    { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
    { name: "Secunderabad", lat: 17.3724, lon: 78.5037 },
    { name: "Warangal", lat: 17.9689, lon: 78.6294 },
    { name: "Ramagundam", lat: 18.8233, lon: 79.4268 },
  ],
  Karnataka: [
    { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
    { name: "Mangaluru", lat: 12.8657, lon: 74.844 },
    { name: "Mysore", lat: 12.2958, lon: 76.6394 },
    { name: "Hubballi", lat: 15.3647, lon: 75.124 },
  ],
  "Tamil Nadu": [
    { name: "Chennai", lat: 13.0827, lon: 80.2707 },
    { name: "Coimbatore", lat: 11.0066, lon: 76.9589 },
    { name: "Madurai", lat: 9.9252, lon: 78.1198 },
    { name: "Salem", lat: 11.6643, lon: 78.146 },
  ],
  Kerala: [
    { name: "Kochi", lat: 9.9312, lon: 76.2673 },
    { name: "Thiruvananthapuram", lat: 8.5241, lon: 76.9366 },
    { name: "Kozhikode", lat: 11.2588, lon: 75.7804 },
    { name: "Thrissur", lat: 10.5276, lon: 76.2144 },
  ],
  Puducherry: [
    { name: "Puducherry", lat: 12.0657, lon: 79.8711 },
    { name: "Karaikal", lat: 10.9314, lon: 79.1399 },
  ],
  Lakshadweep: [{ name: "Kavaratti", lat: 10.5667, lon: 72.6417 }],

  // Eastern Region
  "West Bengal": [
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    { name: "Howrah", lat: 22.5958, lon: 88.2636 },
    { name: "Durgapur", lat: 23.8103, lon: 87.3118 },
    { name: "Asansol", lat: 23.684, lon: 86.9497 },
  ],
  Bihar: [
    { name: "Patna", lat: 25.5941, lon: 85.1376 },
    { name: "Gaya", lat: 24.7955, lon: 84.9994 },
    { name: "Bhagalpur", lat: 25.2788, lon: 86.4948 },
    { name: "Muzaffarpur", lat: 26.1209, lon: 85.391 },
  ],
  Jharkhand: [
    { name: "Ranchi", lat: 23.3441, lon: 85.3096 },
    { name: "Jamshedpur", lat: 22.8046, lon: 86.1815 },
    { name: "Dhanbad", lat: 23.7957, lon: 86.4304 },
    { name: "Giridih", lat: 24.18, lon: 84.8 },
  ],
  Odisha: [
    { name: "Bhubaneswar", lat: 20.2961, lon: 85.8245 },
    { name: "Cuttack", lat: 20.4625, lon: 85.883 },
    { name: "Rourkela", lat: 22.2604, lon: 84.8536 },
    { name: "Sambalpur", lat: 21.4742, lon: 83.9739 },
  ],
  Sikkim: [
    { name: "Gangtok", lat: 27.533, lon: 88.6139 },
    { name: "Siliguri", lat: 26.7271, lon: 88.3953 },
  ],
  "Andaman and Nicobar Islands": [
    { name: "Port Blair", lat: 11.7401, lon: 92.6586 },
  ],

  // North-Eastern Region
  Assam: [
    { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
    { name: "Silchar", lat: 24.8218, lon: 88.6129 },
    { name: "Dibrugarh", lat: 27.4728, lon: 94.9142 },
    { name: "Tezpur", lat: 26.6338, lon: 92.7974 },
  ],
  Meghalaya: [
    { name: "Shillong", lat: 25.5788, lon: 91.8933 },
    { name: "Tura", lat: 25.5142, lon: 90.2257 },
  ],
  Tripura: [
    { name: "Agartala", lat: 23.8103, lon: 91.2787 },
    { name: "Udaipur", lat: 23.3381, lon: 91.4348 },
  ],
  Mizoram: [
    { name: "Aizawl", lat: 23.8103, lon: 92.7365 },
    { name: "Lunglei", lat: 22.8833, lon: 92.7505 },
  ],
  Manipur: [
    { name: "Imphal", lat: 24.817, lon: 94.9042 },
    { name: "Bishnupur", lat: 24.817, lon: 94.9042 },
  ],
  Nagaland: [
    { name: "Kohima", lat: 25.6115, lon: 94.1079 },
    { name: "Dimapur", lat: 25.905, lon: 93.7368 },
  ],
  "Arunachal Pradesh": [
    { name: "Itanagar", lat: 28.218, lon: 93.6053 },
    { name: "Naharlagun", lat: 28.0966, lon: 93.6595 },
  ],
};

export const getAllStates = (): string[] => Object.keys(CITIES_BY_STATE);

export const getCitiesForState = (state: string): CityInfo[] =>
  CITIES_BY_STATE[state] ?? [];
