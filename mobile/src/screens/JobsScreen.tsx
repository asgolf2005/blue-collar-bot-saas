import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import type { Job, RootStackParamList } from '../types'

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

type Props = NativeStackScreenProps<RootStackParamList, 'Jobs'>

export default function JobsScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadJobs = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      const { data } = await supabase
        .from('jobs')
        .select(
          'id, status, scheduled_start, scheduled_end, description, customer:customers(name, address, phone)'
        )
        .eq('technician_id', authData.user.id)
        .gte('scheduled_start', start.toISOString())
        .lte('scheduled_start', end.toISOString())
        .order('scheduled_start', { ascending: true })

      setJobs((data as Job[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      ),
    })
  }, [navigation])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadJobs()
    setRefreshing(false)
  }, [loadJobs])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No jobs scheduled</Text>
            <Text style={styles.emptySubtitle}>Check back later for updates.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const customerName = item.customer?.name || 'Customer'
          const startTime = new Date(item.scheduled_start).toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{customerName}</Text>
                <Text style={styles.cardStatus}>
                  {statusLabels[item.status] || item.status}
                </Text>
              </View>
              <Text style={styles.cardTime}>{startTime}</Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description || 'Service job'}
              </Text>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
  },
  signOut: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1f2937',
  },
  signOutPressed: {
    opacity: 0.8,
  },
  signOutText: {
    color: '#f9fafb',
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: '#1f2937',
    borderWidth: 1,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  cardStatus: {
    color: '#93c5fd',
    fontSize: 12,
  },
  cardTime: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  cardDescription: {
    color: '#d1d5db',
    fontSize: 13,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#9ca3af',
    marginTop: 8,
  },
})
