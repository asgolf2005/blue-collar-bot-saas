'use client'

import { createClient } from './client'
import { RealtimeChannel } from '@supabase/supabase-js'

export type NotificationPayload = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export class RealtimeNotifications {
  private channel: RealtimeChannel | null = null
  private supabase = createClient()

  /**
   * Subscribe to real-time notifications for a user
   */
  subscribe(userId: string, onNotification: (notification: NotificationPayload) => void) {
    // Create channel for this user's notifications
    this.channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload)
          onNotification(payload.new as NotificationPayload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Notification updated:', payload)
          // Could handle read status updates here if needed
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status)
      })

    return this.channel
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribe() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }

    return true
  }

  /**
   * Get recent notifications for a user
   */
  async getNotifications(userId: string, limit = 20) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  }
}

// Singleton instance
let realtimeNotifications: RealtimeNotifications | null = null

export function getRealtimeNotifications() {
  if (!realtimeNotifications) {
    realtimeNotifications = new RealtimeNotifications()
  }
  return realtimeNotifications
}
