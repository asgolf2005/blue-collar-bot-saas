export type RootStackParamList = {
  Login: undefined
  Jobs: undefined
  JobDetail: { jobId: string }
}

export type Job = {
  id: string
  status: string
  scheduled_start: string
  scheduled_end: string
  description: string | null
  customer?: {
    name?: string | null
    address?: string | null
    phone?: string | null
  } | null
}
