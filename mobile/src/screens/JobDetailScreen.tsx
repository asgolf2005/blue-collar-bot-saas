import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import type { Job, RootStackParamList } from '../types'
import {
  getTrackingJobId,
  isTrackingActive,
  startLocationTracking,
  stopLocationTracking,
} from '../location/tracking'

const statusOptions = [
  'scheduled',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
]

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>

export default function JobDetailScreen({ route }: Props) {
  const { jobId } = route.params
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null)
  const [trackingActive, setTrackingActive] = useState(false)

  const refreshTracking = useCallback(async () => {
    const [activeJobId, active] = await Promise.all([
      getTrackingJobId(),
      isTrackingActive(),
    ])
    setTrackingJobId(activeJobId)
    setTrackingActive(active)
  }, [])

  useEffect(() => {
    const loadJob = async () => {
      try {
        const { data } = await supabase
          .from('jobs')
          .select(
            'id, status, scheduled_start, scheduled_end, description, customer:customers(name, address, phone)'
          )
          .eq('id', jobId)
          .single()

        setJob((data as Job) || null)
      } finally {
        setLoading(false)
      }
    }

    loadJob()
    refreshTracking()
  }, [jobId, refreshTracking])

  const handleStatusUpdate = async (status: string) => {
    if (!job || updating) return

    setUpdating(true)
    const { data, error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', job.id)
      .select()
      .single()

    if (!error && data) {
      setJob(data as Job)
    }

    setUpdating(false)
  }

  const handleTrackingToggle = async () => {
    if (trackingActive && trackingJobId === jobId) {
      await stopLocationTracking()
    } else {
      await startLocationTracking(jobId)
    }
    await refreshTracking()
  }

  if (loading || !job) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  const customerName = job.customer?.name || 'Customer'
  const phone = job.customer?.phone
  const startTime = new Date(job.scheduled_start).toLocaleString('en-AU', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  })
  const trackingForJob = trackingActive && trackingJobId === jobId

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{customerName}</Text>
        <Text style={styles.subtitle}>{startTime}</Text>
        <Text style={styles.description}>{job.description || 'Service job'}</Text>

        {phone ? (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Text style={styles.buttonText}>Call customer</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusGrid}>
          {statusOptions.map((status) => (
            <Pressable
              key={status}
              style={({ pressed }) => [
                styles.statusPill,
                job.status === status && styles.statusPillActive,
                pressed && styles.statusPillPressed,
              ]}
              onPress={() => handleStatusUpdate(status)}
            >
              <Text
                style={
                  job.status === status
                    ? styles.statusTextActive
                    : styles.statusText
                }
              >
                {status.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
        {updating ? (
          <Text style={styles.helper}>Updating status...</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Live location</Text>
        <Text style={styles.helper}>
          {trackingForJob
            ? 'Tracking is active for this job.'
            : 'Start tracking to share live ETA with admin and customer.'}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            trackingForJob ? styles.buttonStop : styles.buttonStart,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleTrackingToggle}
        >
          <Text style={styles.buttonText}>
            {trackingForJob ? 'Stop tracking' : 'Start tracking'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderColor: '#1f2937',
    borderWidth: 1,
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    marginTop: 4,
  },
  description: {
    color: '#d1d5db',
    marginTop: 10,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontWeight: '600',
    marginBottom: 8,
  },
  helper: {
    color: '#9ca3af',
    marginTop: 6,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillActive: {
    borderColor: '#2563eb',
    backgroundColor: '#1e3a8a',
  },
  statusPillPressed: {
    opacity: 0.8,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: '#fff',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonStart: {
    backgroundColor: '#2563eb',
  },
  buttonStop: {
    backgroundColor: '#dc2626',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
})
