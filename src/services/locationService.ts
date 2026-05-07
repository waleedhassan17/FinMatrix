import * as Location from 'expo-location';
import { updateLocationAPI } from '../network/deliveryNetwork';

type LocationCoords = { lat: number; lng: number };

class LocationService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private _isTracking = false;
  private _lastPosition: LocationCoords | null = null;
  private _permissionGranted = false;

  get isTracking() { return this._isTracking; }
  get lastPosition() { return this._lastPosition; }
  get permissionGranted() { return this._permissionGranted; }

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

  async getCurrentPosition(): Promise<LocationCoords | null> {
    try {
      if (!this._permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      this._lastPosition = coords;
      return coords;
    } catch {
      return null;
    }
  }

  private async sendLocation(): Promise<void> {
    const coords = await this.getCurrentPosition();
    if (coords) {
      updateLocationAPI(coords.lat, coords.lng).catch(() => {});
    }
  }

  startTracking(intervalMs = 30_000): void {
    if (this._isTracking) return;
    this._isTracking = true;
    this.sendLocation();
    this.intervalHandle = setInterval(() => this.sendLocation(), intervalMs);
  }

  stopTracking(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this._isTracking = false;
  }
}

export const locationService = new LocationService();
