import type { ReactNode } from "react"
import Link from "next/link"
import { Home, Settings, Activity } from "lucide-react"

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5" /> },
    { href: "/admin/api-test", label: "API Test", icon: <Settings className="w-5 h-5" /> },
    { href: "/admin/api-status", label: "API Status", icon: <Activity className="w-5 h-5" /> },
    { href: "/admin/cache", label: "Cache Beheer", icon: <Settings className="w-5 h-5" /> },
  ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <Link href="/admin/dashboard" className="flex items-center">
            <span className="text-xl font-bold text-[#1e1839]">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 pb-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center px-4 py-3 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
