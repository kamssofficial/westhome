import { LiquidButton, MetalButton, Button } from "@/components/ui/liquid-glass-button"
import { ShoppingCart, Heart, Star, ArrowRight } from "lucide-react"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-20">

        <section className="text-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight">Button Showcase</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three premium button styles for your WestHome storefront
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Liquid Glass</h2>
          <p className="text-muted-foreground">Frosted glass effect with SVG displacement filter</p>
          <div className="flex flex-wrap items-center gap-4">
            <LiquidButton>Liquid Glass</LiquidButton>
            <LiquidButton variant="outline" size="lg">Outline</LiquidButton>
            <LiquidButton size="sm">Small</LiquidButton>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Metal Button</h2>
          <p className="text-muted-foreground">Realistic 3D metallic button with press/hover states</p>
          <div className="flex flex-wrap items-center gap-4">
            <MetalButton variant="default">Default</MetalButton>
            <MetalButton variant="primary">Primary</MetalButton>
            <MetalButton variant="success">Success</MetalButton>
            <MetalButton variant="error">Error</MetalButton>
            <MetalButton variant="gold">Gold</MetalButton>
            <MetalButton variant="bronze">Bronze</MetalButton>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">shadcn Button</h2>
          <p className="text-muted-foreground">Standard shadcn button with CVA variants</p>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="cool">Cool</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Practical Usage</h2>
          <p className="text-muted-foreground">Buttons in real e-commerce context</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-xl p-6 space-y-4">
              <div className="aspect-square bg-muted rounded-lg" />
              <h3 className="font-medium">Framed Art Print</h3>
              <p className="text-lg font-bold">INR 3,499</p>
              <MetalButton variant="primary" className="w-full">
                <ShoppingCart className="mr-2 size-4" />
                Add to Cart
              </MetalButton>
            </div>

            <div className="border rounded-xl p-6 space-y-4">
              <Star className="size-8 text-yellow-500" />
              <h3 className="font-medium">Premium Membership</h3>
              <p className="text-sm text-muted-foreground">Exclusive access to new collections</p>
              <LiquidButton className="w-full">
                Join Now
                <ArrowRight className="ml-2 size-4" />
              </LiquidButton>
            </div>

            <div className="border rounded-xl p-6 space-y-4">
              <div className="aspect-square bg-muted rounded-lg" />
              <h3 className="font-medium">Ceramic Vase</h3>
              <p className="text-lg font-bold">INR 1,299</p>
              <div className="flex gap-2">
                <MetalButton variant="success" className="flex-1">
                  Add to Cart
                </MetalButton>
                <MetalButton variant="default" className="px-3">
                  <Heart className="size-4" />
                </MetalButton>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
