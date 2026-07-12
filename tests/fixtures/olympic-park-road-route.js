// BRouter trekking profile over OpenStreetMap footway/service/cycleway links.
// The source returned 150 routed vertices and a 4,177 m track. This fixture keeps
// every third routed vertex (plus the endpoint); no synthetic off-road point is added.
export const OLYMPIC_PARK_ROAD_ROUTE_META = Object.freeze({
  name: '서울 올림픽공원 보행로 순환 경로',
  router: 'BRouter 1.7.9 trekking',
  sourceRoutePointCount: 150,
  sampledEvery: 3,
  expectedTrackLengthM: 4177,
  sourceUrl: 'https://brouter.de/brouter?lonlats=127.11570,37.52025%7C127.12152,37.52155%7C127.12480,37.51675%7C127.11830,37.51490%7C127.11570,37.52025&profile=trekking&alternativeidx=0&format=geojson',
});

const COORDINATES = [
  [127.115765, 37.520094, 30], [127.116209, 37.519974, 26.25],
  [127.117160, 37.521259, 20.75], [127.117957, 37.521504, 24.5],
  [127.118399, 37.521633, 28], [127.119167, 37.521666, 30],
  [127.119404, 37.521534, 31.5], [127.119752, 37.521431, 32.25],
  [127.120126, 37.521566, 33], [127.120558, 37.521422, 29.25],
  [127.121161, 37.521229, 28.75], [127.121420, 37.521642, 24.75],
  [127.122023, 37.522351, 23], [127.122354, 37.523265, 20.25],
  [127.123126, 37.523111, 22.25], [127.123610, 37.522418, 26],
  [127.124168, 37.521111, 25.5], [127.125097, 37.520732, 20],
  [127.125843, 37.520577, 25.75], [127.126389, 37.519865, 27],
  [127.126479, 37.519080, 25.25], [127.126399, 37.518638, 22.75],
  [127.125979, 37.518075, 20], [127.125565, 37.517813, 22.75],
  [127.125411, 37.517410, 24.5], [127.124832, 37.517329, 24],
  [127.124042, 37.517644, 24.75], [127.123260, 37.517776, 28],
  [127.122897, 37.517703, 28.25], [127.122616, 37.517488, 27.5],
  [127.122433, 37.517061, 30.5], [127.122454, 37.516504, 32.5],
  [127.123176, 37.515919, 26], [127.123367, 37.515297, 25],
  [127.122927, 37.514822, 26.25], [127.122458, 37.514355, 28.25],
  [127.123006, 37.514080, 28], [127.122750, 37.513626, 30],
  [127.121170, 37.514230, 26.5], [127.119647, 37.514765, 26.5],
  [127.118583, 37.515154, 23], [127.116033, 37.515962, 19],
  [127.115661, 37.516101, 19.25], [127.115750, 37.516585, 18.75],
  [127.113365, 37.517506, 21.75], [127.113301, 37.517701, 21.25],
  [127.113264, 37.517764, 21.25], [127.114349, 37.519861, 23.5],
  [127.114866, 37.519780, 25.5], [127.116194, 37.519951, 26.25],
  [127.115765, 37.520094, 30],
];

function distanceMeters(previous, current) {
  const toRad = value => value * Math.PI / 180;
  const lat1 = toRad(previous[1]);
  const lat2 = toRad(current[1]);
  const dLat = lat2 - lat1;
  const dLng = toRad(current[0] - previous[0]);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const STARTED_AT = 1_720_000_000_000;
let elapsedMs = 0;

export const OLYMPIC_PARK_ROAD_ROUTE = Object.freeze(COORDINATES.map((coordinate, index) => {
  if (index > 0) elapsedMs += Math.max(1_000, Math.round(distanceMeters(COORDINATES[index - 1], coordinate) / 3 * 1_000));
  return Object.freeze({
    lat: coordinate[1],
    lng: coordinate[0],
    altitude: coordinate[2],
    accuracy: 5 + (index % 4),
    speed: 3,
    ts: STARTED_AT + elapsedMs,
    segmentId: 0,
  });
}));
