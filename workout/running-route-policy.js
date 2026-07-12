import { normalizeRunningRoutePoints } from './running-route-store.js';

export const RUNNING_ROUTE_POLICY = Object.freeze({
  maxDistanceAccuracyM: 35,
  minDisplacementM: 12,
  maxErrorRadiusM: 30,
  minConfidentSpeedMps: 0.3,
  maxPlausibleSpeedMps: 15,
});

const EARTH_RADIUS_M = 6_371_000;

export function runningRouteSegmentId(point, fallback = 0) {
  const value = Number(point?.segmentId);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function isExplicitRunningRouteGap(previous, point) {
  if (!previous || !point) return false;
  if (point.gapBefore === true) return true;
  const previousSegmentId = Number(previous.segmentId);
  const nextSegmentId = Number(point.segmentId);
  return Number.isFinite(previousSegmentId)
    && Number.isFinite(nextSegmentId)
    && previousSegmentId !== nextSegmentId;
}

// Rendering is evidence-preserving: time gaps and accuracy never invent or remove
// geometry. Only a capture lifecycle event recorded in the route may split a line.
export function splitExplicitRunningRouteSegments(points = []) {
  const route = Array.isArray(points) ? points : [];
  const segments = [];
  let segment = [];
  for (const point of route) {
    const previous = segment[segment.length - 1];
    if (segment.length && isExplicitRunningRouteGap(previous, point)) {
      segments.push(segment);
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length) segments.push(segment);
  return segments;
}

export function runningDistanceMeters(previous, point) {
  if (!previous || !point) return 0;
  const toRad = value => Number(value) * Math.PI / 180;
  const lat1 = toRad(previous.lat);
  const lat2 = toRad(point.lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(point.lng) - toRad(previous.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isConfidentRunningMovement(previous, point, policy = RUNNING_ROUTE_POLICY) {
  if (!previous || !point || isExplicitRunningRouteGap(previous, point)) return false;
  const elapsedSec = (Number(point.ts) - Number(previous.ts)) / 1000;
  if (!Number.isFinite(elapsedSec) || elapsedSec <= 0) return false;

  const distanceM = runningDistanceMeters(previous, point);
  if (!Number.isFinite(distanceM)) return false;
  const previousAccuracy = Math.max(0, Number(previous.accuracy) || 0);
  const currentAccuracy = Math.max(0, Number(point.accuracy) || 0);
  if (previousAccuracy > policy.maxDistanceAccuracyM || currentAccuracy > policy.maxDistanceAccuracyM) return false;

  const errorRadiusM = Math.max(
    policy.minDisplacementM,
    Math.min(policy.maxErrorRadiusM, Math.max(previousAccuracy, currentAccuracy) * 2),
  );
  if (distanceM < errorRadiusM) return false;

  const inferredSpeedMps = distanceM / elapsedSec;
  return inferredSpeedMps >= policy.minConfidentSpeedMps
    && inferredSpeedMps <= policy.maxPlausibleSpeedMps;
}

export function buildConfirmedRunningMovementRoute(points = [], policy = RUNNING_ROUTE_POLICY) {
  const route = normalizeRunningRoutePoints(points);
  if (route.length < 2) return route;
  const confirmed = [];
  let anchor = null;
  for (const point of route) {
    const accuracy = Number(point.accuracy);
    if (Number.isFinite(accuracy) && accuracy > policy.maxDistanceAccuracyM) continue;
    if (!anchor || isExplicitRunningRouteGap(anchor, point)) {
      confirmed.push(point);
      anchor = point;
      continue;
    }
    if (!isConfidentRunningMovement(anchor, point, policy)) continue;
    confirmed.push(point);
    anchor = point;
  }
  return confirmed;
}

export function runningRouteDistanceMeters(points = [], policy = RUNNING_ROUTE_POLICY) {
  const movementRoute = buildConfirmedRunningMovementRoute(points, policy);
  let total = 0;
  for (let index = 1; index < movementRoute.length; index += 1) {
    if (isExplicitRunningRouteGap(movementRoute[index - 1], movementRoute[index])) continue;
    total += runningDistanceMeters(movementRoute[index - 1], movementRoute[index]);
  }
  return total;
}

export function buildRunningRouteModel(points = [], policy = RUNNING_ROUTE_POLICY) {
  const rawRoute = normalizeRunningRoutePoints(points);
  const renderRoute = rawRoute.map(point => ({ ...point }));
  const renderSegments = splitExplicitRunningRouteSegments(renderRoute);
  const movementRoute = buildConfirmedRunningMovementRoute(rawRoute, policy);
  return {
    rawRoute,
    renderRoute,
    renderSegments,
    movementRoute,
    diagnostics: Object.freeze({
      sourcePointCount: rawRoute.length,
      renderPointCount: renderRoute.length,
      movementPointCount: movementRoute.length,
      renderSegmentCount: renderSegments.length,
      renderDroppedPointCount: rawRoute.length - renderRoute.length,
      distanceRejectedPointCount: rawRoute.length - movementRoute.length,
    }),
  };
}
