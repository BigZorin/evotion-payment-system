import { NextResponse } from "next/server"

// Mock data for courses - this will be used instead of calling the real API
const mockCourses = [
  {
    collectionId: 1,
    collectionName: "COURSE: 12-Weken Vetverlies Programma",
    courseId: "eWbLVk",
    courseName: "12-Weken Vetverlies Programma",
    productIds: [775911, 775912, 775913],
  },
  {
    collectionId: 2,
    collectionName: "COURSE: Uitleg van Oefeningen",
    courseId: "vgDnxN",
    courseName: "Uitleg van Oefeningen",
    productIds: [775911, 775914],
  },
  {
    collectionId: 3,
    collectionName: "COURSE: Evotion-Coaching App Handleiding",
    courseId: "JMaGxK",
    courseName: "Evotion-Coaching App Handleiding",
    productIds: [775911, 775915],
  },
  {
    collectionId: 4,
    collectionName: "COURSE: Basis Cursus",
    courseId: "basic-course-1",
    courseName: "Basis Cursus",
    productIds: [775916],
  },
  {
    collectionId: 5,
    collectionName: "COURSE: Premium Cursus 1",
    courseId: "premium-course-1",
    courseName: "Premium Cursus 1",
    productIds: [775917, 775918],
  },
]

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      console.log("No product ID provided")
      return NextResponse.json({ courses: [] })
    }

    console.log(`Fetching mock courses for product ID: ${id}`)

    // Filter mock courses for this product ID
    const productId = Number(id)
    const courses = mockCourses.filter(
      (course) => Array.isArray(course.productIds) && course.productIds.includes(productId),
    )

    console.log(`Found ${courses.length} mock courses for product ${id}`)

    // Add a small delay to simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300))

    return NextResponse.json({ courses })
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}/courses:`, error)
    return NextResponse.json({ courses: [] })
  }
}
