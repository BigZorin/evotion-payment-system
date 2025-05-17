import type { Product } from "@/lib/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

interface ProductListProps {
  products: Product[]
}

export function ProductList({ products }: ProductListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {products.map((product) => (
        <Card
          key={product.id}
          className="bg-[#1e1839]/80 border-white/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-white/30 group"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-white group-hover:text-white transition-colors duration-300">
              {product.name}
            </CardTitle>
            <CardDescription className="text-white/70">{product.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-3xl font-bold text-white mb-6">{formatCurrency(product.price)}</p>
            <ul className="mt-4 space-y-3">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start text-white/80">
                  <span className="mr-2 text-white">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Link href={`/checkout/${product.id}`} className="w-full">
              <Button className="w-full bg-white hover:bg-white/90 text-[#1e1839] transition-colors duration-300">
                Selecteer en Betaal
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
