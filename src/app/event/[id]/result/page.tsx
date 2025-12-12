'use client'

import { useParams } from 'next/navigation'
import EventResultView from '@/components/EventResultView'

export default function EventResultPage() {
  const params = useParams()
  const eventId = params.id as string

  const handleBack = () => {
    window.location.href = '/'
  }

  return (
    <EventResultView
      eventId={eventId}
      onBack={handleBack}
    />
  )
}