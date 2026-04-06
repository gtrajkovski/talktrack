/**
 * Native capabilities for Capacitor Android app.
 * These are no-ops on web - only work in native Android shell.
 */

import { Capacitor } from '@capacitor/core';

// Lazy imports to avoid errors on web
let KeepAwake: typeof import('@capacitor-community/keep-awake').KeepAwake | null = null;
let ForegroundService: typeof import('@capawesome-team/capacitor-android-foreground-service').ForegroundService | null = null;

// Initialize plugins only on native
async function initPlugins() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const keepAwakeModule = await import('@capacitor-community/keep-awake');
    KeepAwake = keepAwakeModule.KeepAwake;
  } catch (e) {
    console.warn('KeepAwake plugin not available:', e);
  }

  try {
    const foregroundModule = await import('@capawesome-team/capacitor-android-foreground-service');
    ForegroundService = foregroundModule.ForegroundService;
  } catch (e) {
    console.warn('ForegroundService plugin not available:', e);
  }
}

// Auto-init on module load (async)
initPlugins();

/**
 * Check if running in native Capacitor shell
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Keep the screen awake during rehearsal.
 * No-op on web.
 */
export async function keepScreenAwake(): Promise<void> {
  if (!isNative() || !KeepAwake) return;

  try {
    await KeepAwake.keepAwake();
    console.log('[Native] Screen kept awake');
  } catch (e) {
    console.warn('[Native] Failed to keep screen awake:', e);
  }
}

/**
 * Allow the screen to sleep again.
 * No-op on web.
 */
export async function allowScreenSleep(): Promise<void> {
  if (!isNative() || !KeepAwake) return;

  try {
    await KeepAwake.allowSleep();
    console.log('[Native] Screen sleep allowed');
  } catch (e) {
    console.warn('[Native] Failed to allow screen sleep:', e);
  }
}

/**
 * Start foreground service to keep audio alive when screen locks.
 * Shows a persistent notification.
 * No-op on web.
 */
export async function startForegroundService(
  slideTitle: string,
  slideNumber: number,
  totalSlides: number
): Promise<void> {
  if (!isNative() || !ForegroundService) return;

  try {
    await ForegroundService.startForegroundService({
      id: 1,
      title: 'TalkTrack',
      body: `Slide ${slideNumber} of ${totalSlides}: ${slideTitle}`,
      smallIcon: 'ic_stat_icon',
      // Media playback service type for audio
      // @ts-expect-error - types may not include all service types
      serviceType: 'mediaPlayback',
    });
    console.log('[Native] Foreground service started');
  } catch (e) {
    console.warn('[Native] Failed to start foreground service:', e);
  }
}

/**
 * Update the foreground service notification.
 * No-op on web.
 */
export async function updateForegroundNotification(
  slideTitle: string,
  slideNumber: number,
  totalSlides: number
): Promise<void> {
  if (!isNative() || !ForegroundService) return;

  try {
    await ForegroundService.updateForegroundService({
      id: 1,
      title: 'TalkTrack',
      body: `Slide ${slideNumber} of ${totalSlides}: ${slideTitle}`,
      smallIcon: 'ic_stat_icon',
    });
  } catch (e) {
    console.warn('[Native] Failed to update foreground notification:', e);
  }
}

/**
 * Stop the foreground service.
 * No-op on web.
 */
export async function stopForegroundService(): Promise<void> {
  if (!isNative() || !ForegroundService) return;

  try {
    await ForegroundService.stopForegroundService();
    console.log('[Native] Foreground service stopped');
  } catch (e) {
    console.warn('[Native] Failed to stop foreground service:', e);
  }
}

/**
 * Request notification permission (Android 13+).
 * No-op on web or older Android versions.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative() || !ForegroundService) return true;

  try {
    const result = await ForegroundService.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.warn('[Native] Failed to request notification permission:', e);
    return false;
  }
}

/**
 * Combined helper: Start a rehearsal session with native support.
 * Keeps screen awake and starts foreground service.
 */
export async function startNativeRehearsalSession(
  slideTitle: string,
  slideNumber: number,
  totalSlides: number
): Promise<void> {
  if (!isNative()) return;

  // Request permission first (Android 13+)
  await requestNotificationPermission();

  // Keep screen on
  await keepScreenAwake();

  // Start foreground service for audio keep-alive
  await startForegroundService(slideTitle, slideNumber, totalSlides);
}

/**
 * Combined helper: End a rehearsal session and clean up native resources.
 */
export async function endNativeRehearsalSession(): Promise<void> {
  if (!isNative()) return;

  // Stop foreground service
  await stopForegroundService();

  // Allow screen to sleep
  await allowScreenSleep();
}
