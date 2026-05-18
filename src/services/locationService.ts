import * as Location from 'expo-location';
import { updateLocationAPI } from '../network/deliveryNetwork';

export interface LocationData {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

type LocationListener = (data: LocationData) => void;

// Minimum movement in meters to trigger an API update (saves battery)
const MIN_DISTANCE_METERS = 10;
// Maximum interval between updates even if stationary (keep-alive)
const KEEP_ALIVE_MS = 60_000;
// Normal polling interval when moving
const TRACKING_INTERVAL_MS = 15_000;

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class LocationService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private keepAliveHandle: ReturnType<typeof setInterval> | null = null;
  private _isTracking = false;
  private _lastPosition: LocationData | null = null;
  private _lastSentPosition: LocationData | null = null;
  private _permissionGranted = false;
  private _listeners: Set<LocationListener> = new Set();

  get isTracking() { return this._isTracking; }
  get lastPosition() { return this._lastPosition; }
  get permissionGranted() { return this._permissionGranted; }

  addListener(fn: LocationListener): () => void {
    this._listeners.add(fn);
    return () => { this._listeners.delete(fn); };
  }

  private notifyListeners(data: LocationData): void {
    this._listeners.forEach(fn => fn(data));
  }

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this._permissionGranted = status === 'granted';
      return this._permissionGranted;
    } catch {
      this._permissionGranted = false;
      return false;
    }
  }

  async getCurrentPosition(): Promise<LocationData | null> {
    try {
      if (!this._permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const data: LocationData = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed != null ? Math.max(0, pos.coords.speed) : null,
        accuracy: pos.coords.accuracy ?? null,
        timestamp: pos.timestamp,
      };
      this._lastPosition = data;
      this.notifyListeners(data);
      return data;
    } catch {
      return null;
    }
  }

  private shouldSendUpdate(current: LocationData): boolean {
    if (!this._lastSentPosition) return true;
    const distance = haversineDistance(
      this._lastSentPosition.lat, this._lastSentPosition.lng,
      current.lat, current.lng,
    );
    return distance >= MIN_DISTANCE_METERS;
  }

  private async sendLocation(force = false): Promise<void> {
    const data = await this.getCurrentPosition();
    if (!data) return;
    if (!force && !this.shouldSendUpdate(data)) return;
    try {
      await updateLocationAPI(data.lat, data.lng, {
        heading: data.heading,
        speed: data.speed,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
      });
      this._lastSentPosition = data;
    } catch {
      // Silent fail — will retry on next tick
    }
  }

  /** Send an immediate location update (e.g. on status transition) */
  async sendImmediateUpdate(): Promise<LocationData | null> {
    await this.sendLocation(true);
    return this._lastPosition;
  }

  startTracking(intervalMs = TRACKING_INTERVAL_MS): void {
    if (this._isTracking) return;
    this._isTracking = true;
    // Immediate first send
    this.sendLocation(true);
    // Periodic smart updates (only sends if moved > MIN_DISTANCE_METERS)
    this.intervalHandle = setInterval(() => this.sendLocation(), intervalMs);
    // Keep-alive: force-send even if stationary so admin knows we're online
    this.keepAliveHandle = setInterval(() => this.sendLocation(true), KEEP_ALIVE_MS);
  }

  stopTracking(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.keepAliveHandle) {
      clearInterval(this.keepAliveHandle);
      this.keepAliveHandle = null;
    }
    this._isTracking = false;
  }
}

export const locationService = new LocationService();
