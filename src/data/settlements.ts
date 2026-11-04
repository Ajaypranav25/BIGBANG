/**
 * Settlements and cities that light up on the night-side globe, oldest first.
 *
 * `foundedYearsAgo` is the founding date or the earliest generally cited
 * continuous settlement, in years before 2026.0 CE (Y CE -> 2026 - Y,
 * Y BCE -> 2026 + Y - 1); the calendar year is noted in each trailing comment.
 * Many ancient dates are approximate or traditional. Coordinates are present-day
 * locations. Weight: 1 = town, 2 = major city, 3 = dominant world city of its age.
 */
import type { Settlement } from './types'

export const SETTLEMENTS: readonly Settlement[] = [
  { name: 'Jericho', lat: 31.87, lon: 35.44, foundedYearsAgo: 11_625, weight: 3 }, // 9600 BCE
  { name: 'Çatalhöyük', lat: 37.67, lon: 32.83, foundedYearsAgo: 9_125, weight: 3 }, // 7100 BCE
  { name: 'Mehrgarh', lat: 29.38, lon: 67.62, foundedYearsAgo: 9_025, weight: 1 }, // 7000 BCE
  { name: 'Knossos', lat: 35.30, lon: 25.16, foundedYearsAgo: 9_025, weight: 2 }, // 7000 BCE
  { name: 'Nineveh', lat: 36.36, lon: 43.15, foundedYearsAgo: 8_025, weight: 3 }, // 6000 BCE
  { name: 'Plovdiv', lat: 42.14, lon: 24.75, foundedYearsAgo: 8_025, weight: 1 }, // 6000 BCE
  { name: 'Eridu', lat: 30.82, lon: 45.99, foundedYearsAgo: 7_425, weight: 2 }, // 5400 BCE
  { name: 'Uruk', lat: 31.32, lon: 45.64, foundedYearsAgo: 7_025, weight: 3 }, // 5000 BCE
  { name: 'Byblos', lat: 34.12, lon: 35.65, foundedYearsAgo: 7_025, weight: 1 }, // 5000 BCE
  { name: 'Susa', lat: 32.19, lon: 48.26, foundedYearsAgo: 6_225, weight: 2 }, // 4200 BCE
  { name: 'Ur', lat: 30.96, lon: 46.10, foundedYearsAgo: 5_825, weight: 2 }, // 3800 BCE
  { name: 'Harappa', lat: 30.63, lon: 72.86, foundedYearsAgo: 5_325, weight: 2 }, // 3300 BCE
  { name: 'Liangzhu', lat: 30.39, lon: 119.99, foundedYearsAgo: 5_325, weight: 1 }, // 3300 BCE
  { name: 'Thebes (Luxor)', lat: 25.70, lon: 32.64, foundedYearsAgo: 5_225, weight: 2 }, // 3200 BCE
  { name: 'Skara Brae', lat: 59.05, lon: -3.34, foundedYearsAgo: 5_205, weight: 1 }, // 3180 BCE
  { name: 'Memphis', lat: 29.84, lon: 31.25, foundedYearsAgo: 5_125, weight: 3 }, // 3100 BCE
  { name: 'Jerusalem', lat: 31.78, lon: 35.23, foundedYearsAgo: 5_025, weight: 2 }, // 3000 BCE
  { name: 'Damascus', lat: 33.51, lon: 36.29, foundedYearsAgo: 5_025, weight: 2 }, // 3000 BCE
  { name: 'Athens', lat: 37.98, lon: 23.73, foundedYearsAgo: 5_025, weight: 3 }, // 3000 BCE
  { name: 'Tyre', lat: 33.27, lon: 35.20, foundedYearsAgo: 4_775, weight: 2 }, // 2750 BCE
  { name: 'Ashur', lat: 35.46, lon: 43.26, foundedYearsAgo: 4_625, weight: 2 }, // 2600 BCE
  { name: 'Caral', lat: -10.89, lon: -77.52, foundedYearsAgo: 4_625, weight: 2 }, // 2600 BCE
  { name: 'Kerma', lat: 19.60, lon: 30.41, foundedYearsAgo: 4_525, weight: 1 }, // 2500 BCE
  { name: 'Mohenjo-daro', lat: 27.32, lon: 68.14, foundedYearsAgo: 4_525, weight: 3 }, // 2500 BCE
  { name: 'Aleppo', lat: 36.20, lon: 37.16, foundedYearsAgo: 4_425, weight: 1 }, // 2400 BCE
  { name: 'Babylon', lat: 32.54, lon: 44.42, foundedYearsAgo: 4_325, weight: 3 }, // 2300 BCE
  { name: 'Hattusa', lat: 40.02, lon: 34.62, foundedYearsAgo: 4_025, weight: 2 }, // 2000 BCE
  { name: 'Erlitou', lat: 34.69, lon: 112.69, foundedYearsAgo: 3_925, weight: 2 }, // 1900 BCE
  { name: 'Poverty Point', lat: 32.64, lon: -91.41, foundedYearsAgo: 3_725, weight: 1 }, // 1700 BCE
  { name: 'San Lorenzo (Olmec)', lat: 17.75, lon: -94.76, foundedYearsAgo: 3_525, weight: 2 }, // 1500 BCE
  { name: 'Anyang (Yinxu)', lat: 36.12, lon: 114.31, foundedYearsAgo: 3_325, weight: 2 }, // 1300 BCE
  { name: 'Beijing (Ji)', lat: 39.90, lon: 116.40, foundedYearsAgo: 3_070, weight: 3 }, // 1045 BCE
  { name: 'Luoyang', lat: 34.62, lon: 112.45, foundedYearsAgo: 3_061, weight: 2 }, // 1036 BCE
  { name: 'Varanasi', lat: 25.32, lon: 83.01, foundedYearsAgo: 3_025, weight: 1 }, // 1000 BCE
  { name: 'Chavín de Huántar', lat: -9.59, lon: -77.18, foundedYearsAgo: 2_925, weight: 1 }, // 900 BCE
  { name: 'Carthage', lat: 36.85, lon: 10.32, foundedYearsAgo: 2_839, weight: 2 }, // 814 BCE
  { name: 'Meroë', lat: 16.94, lon: 33.73, foundedYearsAgo: 2_825, weight: 1 }, // 800 BCE
  { name: 'Lisbon', lat: 38.72, lon: -9.14, foundedYearsAgo: 2_825, weight: 1 }, // 800 BCE
  { name: 'Tikal', lat: 17.22, lon: -89.62, foundedYearsAgo: 2_825, weight: 2 }, // 800 BCE
  { name: 'Rome', lat: 41.89, lon: 12.49, foundedYearsAgo: 2_778, weight: 3 }, // 753 BCE
  { name: 'Syracuse', lat: 37.08, lon: 15.29, foundedYearsAgo: 2_759, weight: 2 }, // 734 BCE
  { name: 'Samarkand', lat: 39.65, lon: 66.96, foundedYearsAgo: 2_725, weight: 2 }, // 700 BCE
  { name: 'Byzantium / Constantinople / Istanbul', lat: 41.01, lon: 28.98, foundedYearsAgo: 2_682, weight: 3 }, // 657 BCE
  { name: 'Marseille (Massalia)', lat: 43.30, lon: 5.37, foundedYearsAgo: 2_625, weight: 2 }, // 600 BCE
  { name: 'Naples', lat: 40.85, lon: 14.27, foundedYearsAgo: 2_625, weight: 2 }, // 600 BCE
  { name: 'Milan', lat: 45.46, lon: 9.19, foundedYearsAgo: 2_625, weight: 2 }, // 600 BCE
  { name: 'Persepolis', lat: 29.94, lon: 52.89, foundedYearsAgo: 2_543, weight: 2 }, // 518 BCE
  { name: 'Monte Albán', lat: 17.04, lon: -96.77, foundedYearsAgo: 2_525, weight: 2 }, // 500 BCE
  { name: 'Pataliputra (Patna)', lat: 25.61, lon: 85.14, foundedYearsAgo: 2_515, weight: 3 }, // 490 BCE
  { name: 'Nanjing', lat: 32.06, lon: 118.80, foundedYearsAgo: 2_497, weight: 2 }, // 472 BCE
  { name: 'Anuradhapura', lat: 8.31, lon: 80.40, foundedYearsAgo: 2_402, weight: 1 }, // 377 BCE
  { name: 'Kaifeng', lat: 34.80, lon: 114.31, foundedYearsAgo: 2_389, weight: 3 }, // 364 BCE
  { name: 'Alexandria', lat: 31.20, lon: 29.92, foundedYearsAgo: 2_356, weight: 3 }, // 331 BCE
  { name: 'Petra', lat: 30.33, lon: 35.44, foundedYearsAgo: 2_337, weight: 1 }, // 312 BCE
  { name: 'Chengdu', lat: 30.66, lon: 104.06, foundedYearsAgo: 2_336, weight: 1 }, // 311 BCE
  { name: 'Antioch', lat: 36.20, lon: 36.16, foundedYearsAgo: 2_325, weight: 2 }, // 300 BCE
  { name: 'Djenné-Djenno', lat: 13.89, lon: -4.54, foundedYearsAgo: 2_275, weight: 1 }, // 250 BCE
  { name: 'Paris (Lutetia)', lat: 48.86, lon: 2.35, foundedYearsAgo: 2_275, weight: 3 }, // 250 BCE
  { name: 'Guangzhou', lat: 23.13, lon: 113.26, foundedYearsAgo: 2_239, weight: 2 }, // 214 BCE
  { name: 'Chang\'an (Xi\'an)', lat: 34.26, lon: 108.94, foundedYearsAgo: 2_227, weight: 3 }, // 202 BCE
  { name: 'Córdoba', lat: 37.88, lon: -4.78, foundedYearsAgo: 2_194, weight: 2 }, // 169 BCE
  { name: 'Ctesiphon', lat: 33.09, lon: 44.58, foundedYearsAgo: 2_145, weight: 2 }, // 120 BCE
  { name: 'Dunhuang', lat: 40.14, lon: 94.66, foundedYearsAgo: 2_136, weight: 1 }, // 111 BCE
  { name: 'Teotihuacan', lat: 19.69, lon: -98.84, foundedYearsAgo: 2_125, weight: 3 }, // 100 BCE
  { name: 'Florence', lat: 43.77, lon: 11.26, foundedYearsAgo: 2_084, weight: 2 }, // 59 BCE
  { name: 'Seoul', lat: 37.57, lon: 126.98, foundedYearsAgo: 2_043, weight: 2 }, // 18 BCE
  { name: 'Barcelona (Barcino)', lat: 41.39, lon: 2.17, foundedYearsAgo: 2_040, weight: 1 }, // 15 BCE
  { name: 'London (Londinium)', lat: 51.51, lon: -0.13, foundedYearsAgo: 1_979, weight: 3 }, // 47 CE
  { name: 'Manchester', lat: 53.48, lon: -2.24, foundedYearsAgo: 1_947, weight: 2 }, // 79 CE
  { name: 'Aksum', lat: 14.13, lon: 38.72, foundedYearsAgo: 1_926, weight: 2 }, // 100 CE
  { name: 'Vienna (Vindobona)', lat: 48.21, lon: 16.37, foundedYearsAgo: 1_926, weight: 2 }, // 100 CE
  { name: 'Mecca', lat: 21.42, lon: 39.83, foundedYearsAgo: 1_626, weight: 2 }, // 400 CE
  { name: 'Venice', lat: 45.44, lon: 12.33, foundedYearsAgo: 1_605, weight: 2 }, // 421 CE
  { name: 'Kyiv', lat: 50.45, lon: 30.52, foundedYearsAgo: 1_544, weight: 2 }, // 482 CE
  { name: 'Tiwanaku', lat: -16.55, lon: -68.67, foundedYearsAgo: 1_526, weight: 2 }, // 500 CE
  { name: 'Hangzhou', lat: 30.27, lon: 120.16, foundedYearsAgo: 1_437, weight: 3 }, // 589 CE
  { name: 'Chichén Itzá', lat: 20.68, lon: -88.57, foundedYearsAgo: 1_426, weight: 2 }, // 600 CE
  { name: 'Cairo (Fustat)', lat: 30.04, lon: 31.24, foundedYearsAgo: 1_385, weight: 3 }, // 641 CE
  { name: 'Osaka (Naniwa)', lat: 34.69, lon: 135.50, foundedYearsAgo: 1_381, weight: 2 }, // 645 CE
  { name: 'Palembang (Srivijaya)', lat: -2.99, lon: 104.76, foundedYearsAgo: 1_344, weight: 2 }, // 682 CE
  { name: 'Nara', lat: 34.69, lon: 135.80, foundedYearsAgo: 1_316, weight: 1 }, // 710 CE
  { name: 'Baghdad', lat: 33.31, lon: 44.36, foundedYearsAgo: 1_264, weight: 3 }, // 762 CE
  { name: 'Fez', lat: 34.03, lon: -5.00, foundedYearsAgo: 1_237, weight: 2 }, // 789 CE
  { name: 'Kyoto', lat: 35.01, lon: 135.77, foundedYearsAgo: 1_232, weight: 2 }, // 794 CE
  { name: 'Dublin', lat: 53.35, lon: -6.26, foundedYearsAgo: 1_185, weight: 1 }, // 841 CE
  { name: 'Bagan', lat: 21.17, lon: 94.86, foundedYearsAgo: 1_177, weight: 1 }, // 849 CE
  { name: 'Chan Chan', lat: -8.11, lon: -79.07, foundedYearsAgo: 1_176, weight: 2 }, // 850 CE
  { name: 'Novgorod', lat: 58.52, lon: 31.27, foundedYearsAgo: 1_167, weight: 1 }, // 859 CE
  { name: 'Madrid', lat: 40.42, lon: -3.70, foundedYearsAgo: 1_161, weight: 2 }, // 865 CE
  { name: 'Reykjavík', lat: 64.15, lon: -21.94, foundedYearsAgo: 1_152, weight: 1 }, // 874 CE
  { name: 'Prague', lat: 50.08, lon: 14.44, foundedYearsAgo: 1_146, weight: 2 }, // 880 CE
  { name: 'Angkor', lat: 13.41, lon: 103.87, foundedYearsAgo: 1_137, weight: 3 }, // 889 CE
  { name: 'Kilwa Kisiwani', lat: -8.96, lon: 39.51, foundedYearsAgo: 1_126, weight: 1 }, // 900 CE
  { name: 'Kraków', lat: 50.06, lon: 19.94, foundedYearsAgo: 1_061, weight: 1 }, // 965 CE
  { name: 'Kano', lat: 12.00, lon: 8.52, foundedYearsAgo: 1_027, weight: 1 }, // 999 CE
  { name: 'Ile-Ife', lat: 7.48, lon: 4.56, foundedYearsAgo: 1_026, weight: 1 }, // 1000 CE
  { name: 'Lahore', lat: 31.55, lon: 74.34, foundedYearsAgo: 1_026, weight: 2 }, // 1000 CE
  { name: 'Hanoi (Thăng Long)', lat: 21.03, lon: 105.85, foundedYearsAgo: 1_016, weight: 2 }, // 1010 CE
  { name: 'Oslo', lat: 59.91, lon: 10.75, foundedYearsAgo: 986, weight: 1 }, // 1040 CE
  { name: 'Cahokia', lat: 38.66, lon: -90.06, foundedYearsAgo: 976, weight: 2 }, // 1050 CE
  { name: 'Delhi', lat: 28.61, lon: 77.21, foundedYearsAgo: 966, weight: 2 }, // 1060 CE
  { name: 'Marrakesh', lat: 31.63, lon: -7.99, foundedYearsAgo: 956, weight: 2 }, // 1070 CE
  { name: 'Timbuktu', lat: 16.77, lon: -3.01, foundedYearsAgo: 926, weight: 2 }, // 1100 CE
  { name: 'Great Zimbabwe', lat: -20.27, lon: 30.93, foundedYearsAgo: 926, weight: 2 }, // 1100 CE
  { name: 'Cusco', lat: -13.53, lon: -71.97, foundedYearsAgo: 926, weight: 2 }, // 1100 CE
  { name: 'Moscow', lat: 55.76, lon: 37.62, foundedYearsAgo: 879, weight: 2 }, // 1147 CE
  { name: 'Acoma Pueblo', lat: 34.90, lon: -107.58, foundedYearsAgo: 876, weight: 1 }, // 1150 CE
  { name: 'Copenhagen', lat: 55.68, lon: 12.57, foundedYearsAgo: 859, weight: 1 }, // 1167 CE
  { name: 'Nan Madol', lat: 6.84, lon: 158.33, foundedYearsAgo: 846, weight: 1 }, // 1180 CE
  { name: 'Rapa Nui (Easter Island)', lat: -27.15, lon: -109.43, foundedYearsAgo: 826, weight: 1 }, // 1200 CE
  { name: 'Karakorum', lat: 47.20, lon: 102.82, foundedYearsAgo: 806, weight: 2 }, // 1220 CE
  { name: 'Berlin', lat: 52.52, lon: 13.40, foundedYearsAgo: 789, weight: 2 }, // 1237 CE
  { name: 'Stockholm', lat: 59.33, lon: 18.07, foundedYearsAgo: 774, weight: 1 }, // 1252 CE
  { name: 'Amsterdam', lat: 52.37, lon: 4.90, foundedYearsAgo: 751, weight: 2 }, // 1275 CE
  { name: 'Shanghai', lat: 31.23, lon: 121.47, foundedYearsAgo: 734, weight: 2 }, // 1292 CE
  { name: 'Warsaw', lat: 52.23, lon: 21.01, foundedYearsAgo: 726, weight: 1 }, // 1300 CE
  { name: 'Tenochtitlan / Mexico City', lat: 19.43, lon: -99.13, foundedYearsAgo: 701, weight: 3 }, // 1325 CE
  { name: 'Vijayanagara (Hampi)', lat: 15.33, lon: 76.46, foundedYearsAgo: 690, weight: 2 }, // 1336 CE
  { name: 'Ayutthaya', lat: 14.35, lon: 100.57, foundedYearsAgo: 675, weight: 2 }, // 1351 CE
  { name: 'Malacca', lat: 2.19, lon: 102.25, foundedYearsAgo: 626, weight: 2 }, // 1400 CE
  { name: 'Tokyo (Edo)', lat: 35.69, lon: 139.75, foundedYearsAgo: 569, weight: 3 }, // 1457 CE
  { name: 'Bucharest', lat: 44.43, lon: 26.10, foundedYearsAgo: 567, weight: 1 }, // 1459 CE
  { name: 'Lagos', lat: 6.45, lon: 3.39, foundedYearsAgo: 554, weight: 2 }, // 1472 CE
  { name: 'Santo Domingo', lat: 18.47, lon: -69.89, foundedYearsAgo: 530, weight: 1 }, // 1496 CE
  { name: 'Agra', lat: 27.18, lon: 78.01, foundedYearsAgo: 522, weight: 2 }, // 1504 CE
  { name: 'Havana', lat: 23.13, lon: -82.36, foundedYearsAgo: 507, weight: 1 }, // 1519 CE
  { name: 'Panama City', lat: 8.98, lon: -79.52, foundedYearsAgo: 507, weight: 1 }, // 1519 CE
  { name: 'Jakarta', lat: -6.21, lon: 106.85, foundedYearsAgo: 499, weight: 2 }, // 1527 CE
  { name: 'Cartagena', lat: 10.39, lon: -75.51, foundedYearsAgo: 493, weight: 1 }, // 1533 CE
  { name: 'Mumbai (Bombay)', lat: 18.94, lon: 72.84, foundedYearsAgo: 492, weight: 2 }, // 1534 CE
  { name: 'Quito', lat: -0.18, lon: -78.47, foundedYearsAgo: 492, weight: 1 }, // 1534 CE
  { name: 'Lima', lat: -12.05, lon: -77.04, foundedYearsAgo: 491, weight: 2 }, // 1535 CE
  { name: 'Bengaluru', lat: 12.97, lon: 77.59, foundedYearsAgo: 489, weight: 1 }, // 1537 CE
  { name: 'Bogotá', lat: 4.71, lon: -74.07, foundedYearsAgo: 488, weight: 2 }, // 1538 CE
  { name: 'Santiago', lat: -33.45, lon: -70.67, foundedYearsAgo: 485, weight: 2 }, // 1541 CE
  { name: 'Guadalajara', lat: 20.67, lon: -103.35, foundedYearsAgo: 484, weight: 1 }, // 1542 CE
  { name: 'Potosí', lat: -19.58, lon: -65.75, foundedYearsAgo: 481, weight: 2 }, // 1545 CE
  { name: 'La Paz', lat: -16.50, lon: -68.15, foundedYearsAgo: 478, weight: 1 }, // 1548 CE
  { name: 'Salvador da Bahia', lat: -12.97, lon: -38.50, foundedYearsAgo: 477, weight: 2 }, // 1549 CE
  { name: 'Helsinki', lat: 60.17, lon: 24.94, foundedYearsAgo: 476, weight: 1 }, // 1550 CE
  { name: 'São Paulo', lat: -23.55, lon: -46.63, foundedYearsAgo: 472, weight: 2 }, // 1554 CE
  { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17, foundedYearsAgo: 461, weight: 2 }, // 1565 CE
  { name: 'Caracas', lat: 10.49, lon: -66.88, foundedYearsAgo: 459, weight: 1 }, // 1567 CE
  { name: 'Manila', lat: 14.60, lon: 120.98, foundedYearsAgo: 455, weight: 2 }, // 1571 CE
  { name: 'Luanda', lat: -8.84, lon: 13.23, foundedYearsAgo: 450, weight: 1 }, // 1576 CE
  { name: 'Buenos Aires', lat: -34.60, lon: -58.38, foundedYearsAgo: 446, weight: 2 }, // 1580 CE
  { name: 'Dhaka', lat: 23.81, lon: 90.41, foundedYearsAgo: 418, weight: 2 }, // 1608 CE
  { name: 'Quebec City', lat: 46.81, lon: -71.21, foundedYearsAgo: 418, weight: 1 }, // 1608 CE
  { name: 'Antananarivo', lat: -18.88, lon: 47.51, foundedYearsAgo: 416, weight: 1 }, // 1610 CE
  { name: 'Medellín', lat: 6.24, lon: -75.58, foundedYearsAgo: 410, weight: 1 }, // 1616 CE
  { name: 'New York (New Amsterdam)', lat: 40.71, lon: -74.01, foundedYearsAgo: 402, weight: 3 }, // 1624 CE
  { name: 'Boston', lat: 42.36, lon: -71.06, foundedYearsAgo: 396, weight: 2 }, // 1630 CE
  { name: 'Yakutsk', lat: 62.03, lon: 129.73, foundedYearsAgo: 394, weight: 1 }, // 1632 CE
  { name: 'Chennai (Madras)', lat: 13.08, lon: 80.27, foundedYearsAgo: 387, weight: 2 }, // 1639 CE
  { name: 'Ulaanbaatar', lat: 47.92, lon: 106.92, foundedYearsAgo: 387, weight: 1 }, // 1639 CE
  { name: 'Montreal', lat: 45.50, lon: -73.57, foundedYearsAgo: 384, weight: 2 }, // 1642 CE
  { name: 'Cape Town', lat: -33.92, lon: 18.42, foundedYearsAgo: 374, weight: 2 }, // 1652 CE
  { name: 'Manaus', lat: -3.12, lon: -60.02, foundedYearsAgo: 357, weight: 1 }, // 1669 CE
  { name: 'Philadelphia', lat: 39.95, lon: -75.17, foundedYearsAgo: 344, weight: 2 }, // 1682 CE
  { name: 'Kolkata (Calcutta)', lat: 22.57, lon: 88.36, foundedYearsAgo: 336, weight: 2 }, // 1690 CE
  { name: 'Ho Chi Minh City (Saigon)', lat: 10.78, lon: 106.70, foundedYearsAgo: 328, weight: 1 }, // 1698 CE
  { name: 'Saint Petersburg', lat: 59.94, lon: 30.31, foundedYearsAgo: 323, weight: 2 }, // 1703 CE
  { name: 'Taipei', lat: 25.03, lon: 121.56, foundedYearsAgo: 317, weight: 1 }, // 1709 CE
  { name: 'New Orleans', lat: 29.95, lon: -90.07, foundedYearsAgo: 308, weight: 1 }, // 1718 CE
  { name: 'Montevideo', lat: -34.90, lon: -56.16, foundedYearsAgo: 302, weight: 1 }, // 1724 CE
  { name: 'Nuuk', lat: 64.18, lon: -51.72, foundedYearsAgo: 298, weight: 1 }, // 1728 CE
  { name: 'Karachi', lat: 24.86, lon: 67.01, foundedYearsAgo: 297, weight: 2 }, // 1729 CE
  { name: 'San Francisco', lat: 37.77, lon: -122.42, foundedYearsAgo: 250, weight: 2 }, // 1776 CE
  { name: 'Los Angeles', lat: 34.05, lon: -118.24, foundedYearsAgo: 245, weight: 2 }, // 1781 CE
  { name: 'Bangkok', lat: 13.76, lon: 100.50, foundedYearsAgo: 244, weight: 2 }, // 1782 CE
  { name: 'Sydney', lat: -33.87, lon: 151.21, foundedYearsAgo: 238, weight: 2 }, // 1788 CE
  { name: 'Washington, D.C.', lat: 38.90, lon: -77.04, foundedYearsAgo: 236, weight: 2 }, // 1790 CE
  { name: 'Toronto', lat: 43.65, lon: -79.38, foundedYearsAgo: 233, weight: 2 }, // 1793 CE
  { name: 'Singapore', lat: 1.29, lon: 103.85, foundedYearsAgo: 207, weight: 2 }, // 1819 CE
  { name: 'Khartoum', lat: 15.50, lon: 32.56, foundedYearsAgo: 205, weight: 1 }, // 1821 CE
  { name: 'Brisbane', lat: -27.47, lon: 153.03, foundedYearsAgo: 201, weight: 1 }, // 1825 CE
  { name: 'Perth', lat: -31.95, lon: 115.86, foundedYearsAgo: 197, weight: 1 }, // 1829 CE
  { name: 'Dubai', lat: 25.20, lon: 55.27, foundedYearsAgo: 193, weight: 2 }, // 1833 CE
  { name: 'Chicago', lat: 41.88, lon: -87.63, foundedYearsAgo: 193, weight: 2 }, // 1833 CE
  { name: 'Melbourne', lat: -37.81, lon: 144.96, foundedYearsAgo: 191, weight: 2 }, // 1835 CE
  { name: 'Houston', lat: 29.76, lon: -95.37, foundedYearsAgo: 190, weight: 1 }, // 1836 CE
  { name: 'Auckland', lat: -36.85, lon: 174.76, foundedYearsAgo: 186, weight: 1 }, // 1840 CE
  { name: 'Wellington', lat: -41.29, lon: 174.78, foundedYearsAgo: 186, weight: 1 }, // 1840 CE
  { name: 'Hong Kong', lat: 22.28, lon: 114.16, foundedYearsAgo: 185, weight: 2 }, // 1841 CE
  { name: 'Punta Arenas', lat: -53.16, lon: -70.91, foundedYearsAgo: 178, weight: 1 }, // 1848 CE
  { name: 'Seattle', lat: 47.61, lon: -122.33, foundedYearsAgo: 175, weight: 1 }, // 1851 CE
  { name: 'Dakar', lat: 14.69, lon: -17.45, foundedYearsAgo: 169, weight: 1 }, // 1857 CE
  { name: 'Kuala Lumpur', lat: 3.14, lon: 101.69, foundedYearsAgo: 169, weight: 1 }, // 1857 CE
  { name: 'Denver', lat: 39.74, lon: -104.99, foundedYearsAgo: 168, weight: 1 }, // 1858 CE
  { name: 'Dar es Salaam', lat: -6.79, lon: 39.21, foundedYearsAgo: 164, weight: 1 }, // 1862 CE
  { name: 'Darwin', lat: -12.46, lon: 130.84, foundedYearsAgo: 157, weight: 1 }, // 1869 CE
  { name: 'Port Moresby', lat: -9.44, lon: 147.18, foundedYearsAgo: 153, weight: 1 }, // 1873 CE
  { name: 'Kinshasa', lat: -4.32, lon: 15.31, foundedYearsAgo: 145, weight: 2 }, // 1881 CE
  { name: 'Ushuaia', lat: -54.80, lon: -68.30, foundedYearsAgo: 142, weight: 1 }, // 1884 CE
  { name: 'Addis Ababa', lat: 9.02, lon: 38.75, foundedYearsAgo: 140, weight: 2 }, // 1886 CE
  { name: 'Johannesburg', lat: -26.20, lon: 28.05, foundedYearsAgo: 140, weight: 2 }, // 1886 CE
  { name: 'Vancouver', lat: 49.28, lon: -123.12, foundedYearsAgo: 140, weight: 1 }, // 1886 CE
  { name: 'Novosibirsk', lat: 55.03, lon: 82.92, foundedYearsAgo: 133, weight: 1 }, // 1893 CE
  { name: 'Miami', lat: 25.76, lon: -80.19, foundedYearsAgo: 130, weight: 1 }, // 1896 CE
  { name: 'Nairobi', lat: -1.29, lon: 36.82, foundedYearsAgo: 127, weight: 2 }, // 1899 CE
  { name: 'Anchorage', lat: 61.22, lon: -149.90, foundedYearsAgo: 112, weight: 1 }, // 1914 CE
  { name: 'Brasília', lat: -15.79, lon: -47.88, foundedYearsAgo: 66, weight: 2 }, // 1960 CE
  { name: 'Abuja', lat: 9.06, lon: 7.49, foundedYearsAgo: 50, weight: 1 }, // 1976 CE
  { name: 'Shenzhen', lat: 22.54, lon: 114.06, foundedYearsAgo: 47, weight: 2 }, // 1979 CE
]
