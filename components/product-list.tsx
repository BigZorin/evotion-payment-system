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
          className="bg-white border-[#1e1839]/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-[#1e1839]/30 group"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-[#1e1839] group-hover:text-[#1e1839] transition-colors duration-300">
              {product.name}
            </CardTitle>
            <CardDescription className="text-[#1e1839]/70">{product.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-3xl font-bold text-[#1e1839] mb-6">{formatCurrency(product.price)}</p>
            <ul className="mt-4 space-y-3">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-start text-[#1e1839]/80">
                  <span className="mr-2 text-[#1e1839]">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Link href={`/checkout/${product.id}`} className="w-full">
              <Button className="w-full bg-[#1e1839] hover:bg-white hover:text-[#1e1839] text-white border border-[#1e1839] transition-colors duration-300">
                Selecteer en Betaal
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
