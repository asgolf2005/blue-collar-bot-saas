import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

export const LOCATION_TASK_NAME = 'tech-location-updates'
const TRACKING_JOB_ID_KEY = 'tracking_job_id'

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Location task error', error)
    return
  }

  const taskData = data as Location.LocationTaskData
  const latest = taskData.locations?.[0]
  if (!latest) return

  const jobId = await AsyncStorage.getItem(TRACKING_JOB_ID_KEY)
  if (!jobId) return

  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) return

  const coords = latest.coords
  await supabase.from('technician_locations').insert({
    technician_id: authData.user.id,
    job_id: jobId,
    latitude: coords.latitude,
    longitude: coords.longitude,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    accuracy: coords.accuracy ?? null,
    updated_at: new Date(latest.timestamp).toISOString(),
  })
})

export async function startLocationTracking(jobId: string) {
  await AsyncStorage.setItem(TRACKING_JOB_ID_KEY, jobId)

  const foreground = await Location.requestForegroundPermissionsAsync()
  if (foreground.status !== 'granted') {
    throw new Error('Location permission required')
  }

  const background = await Location.requestBackgroundPermissionsAsync()
  if (background.status !== 'granted') {
    throw new Error('Background location permission required')
  }

  const alreadyTracking = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  )

  if (alreadyTracking) return

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15000,
    distanceInterval: 25,
    deferredUpdatesInterval: 60000,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Blue Collar Bot',
      notificationBody: 'Tracking your location for live job updates',
      notificationColor: '#2563eb',
    },
  })
}

export async function stopLocationTracking() {
  await AsyncStorage.removeItem(TRACKING_JOB_ID_KEY)

  const alreadyTracking = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  )

  if (!alreadyTracking) return

  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
}

export async function getTrackingJobId() {
  return AsyncStorage.getItem(TRACKING_JOB_ID_KEY)
}
