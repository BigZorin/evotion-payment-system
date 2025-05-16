import { ProductList } from "@/components/product-list"
import { products } from "@/lib/products"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Evotion Coaching Diensten</h1>
        <p className="text-lg text-muted-foreground">
          Kies een dienst om direct online te betalen via iDeal of creditcard
        </p>
      </div>

      <ProductList products={products} />
    </main>
  )
}
