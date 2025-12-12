'use client'

import { useParams } from 'next/navigation'
import ParticipantView from '@/components/ParticipantView'

export default function EventPage() {
  const params = useParams()
  const eventId = params.id as string

  const handleBack = () => {
    window.location.href = '/'
  }

  const handleSubmitComplete = () => {
    window.location.href = `/event/${eventId}/result`
  }

  return (
    <ParticipantView
      eventId={eventId}
      onBack={handleBack}
      onSubmitComplete={handleSubmitComplete}
    />
  )
}