import { getProductById } from "@/lib/products"
import { notFound } from "next/navigation"
import { CheckoutForm } from "@/components/checkout-form"
import { formatCurrency } from "@/lib/utils"

interface CheckoutPageProps {
  params: {
    productId: string
  }
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const product = getProductById(params.productId)

  if (!product) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Afrekenen</h1>
        <p className="text-muted-foreground">Vul je gegevens in om je bestelling af te ronden</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <CheckoutForm product={product} />
        </div>

        <div>
          <div className="bg-muted p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Besteloverzicht</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-medium">
                  <span>Totaal</span>
                  <span>{formatCurrency(product.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Inclusief BTW</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
