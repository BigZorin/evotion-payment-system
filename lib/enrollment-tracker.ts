"use server"

// Add a function to track enrollments to prevent duplicates
const enrollmentTracker = new Map<string, boolean>()

// Maak deze functie async, ook al voert het geen asynchrone operaties uit
export async function trackEnrollment(
  sessionId: string,
  contactId: number,
  courseId: string | number,
): Promise<boolean> {
  const key = `${sessionId}_${contactId}_${courseId}`

  if (enrollmentTracker.has(key)) {
    console.log(`Enrollment already processed for session ${sessionId}, contact ${contactId}, course ${courseId}`)
    return false
  }

  enrollmentTracker.set(key, true)
  console.log(`Tracking new enrollment for session ${sessionId}, contact ${contactId}, course ${courseId}`)
  return true
}
