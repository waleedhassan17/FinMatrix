// Type declarations for PlatformMapView platform-split module.
// Metro resolves .native.tsx / .web.tsx at runtime; this file
// provides TypeScript with the type information it needs.
import type { ComponentType } from 'react';

export declare const Marker: ComponentType<any>;
export declare const Callout: ComponentType<any>;
export declare const PROVIDER_GOOGLE: any;

declare const MapView: ComponentType<any>;
export default MapView;
