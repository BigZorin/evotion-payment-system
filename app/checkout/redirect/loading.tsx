import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function CheckoutRedirectLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/evotion-logo-black.png"
            alt="Evotion Coaching"
            width={180}
            height={50}
            className="h-10 w-auto"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Betaalpagina laden</h1>
        <div className="flex justify-center mb-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
        <p className="text-gray-600">Even geduld, we bereiden je betaling voor...</p>
      </div>
    </div>
  )
}
