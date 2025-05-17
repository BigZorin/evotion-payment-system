import { getProductCourseMapping } from "@/lib/products"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export default function ProductCourseMappingPage() {
  const mapping = getProductCourseMapping()

  return (
    <div className="min-h-screen bg-[#1e1839] text-white">
      {/* Header met logo */}
      <header className="container mx-auto px-4 py-6 border-b border-white/10">
        <div className="flex justify-center md:justify-start">
          <Link href="/">
            <Image
              src="/images/evotion-logo-white.png"
              alt="Evotion Coaching"
              width={180}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Product-Cursus Toewijzingen</h1>
          <p className="text-white/70">Overzicht van welke producten toegang geven tot welke cursussen</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(mapping).map(([productId, { productName, courses }]) => (
            <Card key={productId} className="bg-[#1e1839]/80 border-white/10 shadow-md">
              <CardHeader>
                <CardTitle className="text-white">{productName}</CardTitle>
                <CardDescription className="text-white/70">Product ID: {productId}</CardDescription>
              </CardHeader>
              <CardContent>
                <h3 className="text-sm font-medium text-white/80 mb-2">Toegang tot cursussen:</h3>
                {courses.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {courses.map((courseId, index) => (
                      <li key={index} className="text-white/90">
                        {courseId === "eWbLVk" ? (
                          <>
                            <span className="font-medium">12-Weken Vetverlies Programma</span>
                            <span className="text-xs ml-2 text-white/70">(ID: {courseId})</span>
                          </>
                        ) : (
                          <>
                            <span>Cursus ID: {courseId}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60 italic">Geen cursussen toegewezen</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-white/70">© {new Date().getFullYear()} Evotion Coaching. Alle rechten voorbehouden.</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/" className="text-white/70 hover:text-white">
              Terug naar Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
