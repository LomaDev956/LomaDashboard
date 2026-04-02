
"use client";

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Database, PanelLeft, Wrench, Users as UsersIcon, ListPlus, ShieldCheck, PackageSearch, Palette, BookOpenCheck, ShoppingCart, Image as ImageIcon, Smartphone, User, Tag as LabelIcon, Languages, ExternalLink, Activity
} from 'lucide-react'; 
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { ShowQrCodeModal } from '@/components/loma-dashboard/ShowQrCodeModal';
import { LomaDevLogo } from '@/components/loma-dashboard/LomaDevLogo';
import { SmartNotificationCenter } from '@/components/loma-dashboard/SmartNotificationCenter';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean; 
}

const lomaNavItems: NavItem[] = [
  { href: '/loma-dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/loma-dashboard/herramientas', icon: Wrench, label: 'Herramientas' },
  { href: '/loma-dashboard/personal', icon: UsersIcon, label: 'Personal' },
  { href: '/loma-dashboard/garantias', icon: ListPlus, label: 'Crear Lista Garantía' },
  { href: '/loma-dashboard/lista-garantias', icon: ShieldCheck, label: 'Listas de Garantías' },
  { href: '/loma-dashboard/stock', icon: PackageSearch, label: 'Stock (Para Venta)' },
  { href: '/loma-dashboard/vendidos', icon: ShoppingCart, label: 'Vendidos' },
  { href: '/loma-dashboard/etiquetas', icon: LabelIcon, label: 'Diseñador de Etiquetas' },
  { href: '/loma-dashboard/server-health', icon: Activity, label: 'Salud del servidor' },
  { href: '/loma-dashboard/settings', icon: Database, label: 'Ajustes y Respaldos' },
];

const sortedLomaNavItemsForHeader = [...lomaNavItems].sort((a, b) => b.href.length - a.href.length);


function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    if (href === '/loma-dashboard') { 
        return pathname === '/loma-dashboard'; 
    }
    return pathname.startsWith(href) && href !== '/loma-dashboard';
  };
  

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-cyan-500/20 bg-gradient-to-b from-gray-900 via-black to-gray-900 text-gray-100 sm:flex backdrop-blur-xl">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <div className="flex h-16 items-center border-b border-cyan-500/20 px-4 shrink-0 relative z-10">
        <Link href="/loma-dashboard" className="flex items-center gap-2 text-lg font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg animate-pulse"></div>
            <div className="absolute inset-0.5 bg-black rounded-lg flex items-center justify-center">
              <LomaDevLogo className="h-5 w-auto" />
            </div>
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LOMA Tools</span>
        </Link>
      </div>
      <nav className="flex-grow overflow-y-auto px-4 py-4 relative z-10">
        <ul className="space-y-1">
          {lomaNavItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-300 relative group",
                  isActive(item.href, item.exact) 
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20" 
                    : "text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20"
                )}
              >
                {isActive(item.href, item.exact) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-md animate-pulse"></div>
                )}
                <item.icon className={cn("h-5 w-5 relative z-10", isActive(item.href, item.exact) && "text-cyan-400")} />
                <span className="relative z-10">{item.label}</span>
                {isActive(item.href, item.exact) && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                )}
              </Link>
            </li>
          ))}
          <li className="pt-4 mt-4 border-t border-cyan-500/20">
            <Link
              href="/portal"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all duration-300"
            >
              <ExternalLink className="h-5 w-5" />
              <span>Volver al Portal</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      {/* Bottom decoration */}
      <div className="h-16 border-t border-cyan-500/20 flex items-center justify-center relative z-10">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-cyan-400/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
          ))}
        </div>
      </div>
    </aside>
  );
}


function DashboardHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    let pageTitle = "LOMA Tools"; 
    
    const activeLomaNavItem = sortedLomaNavItemsForHeader.find(item => {
        if (item.exact) return pathname === item.href;
        if (item.href === '/loma-dashboard') return pathname === '/loma-dashboard';
        return pathname.startsWith(item.href);
    });

    if (activeLomaNavItem) {
        pageTitle = activeLomaNavItem.label;
    } else if (pathname === '/loma-dashboard') {
        pageTitle = "Dashboard"; 
    }

    const isMobileMenuActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        if (href === '/loma-dashboard') {
            return pathname === '/loma-dashboard';
        }
        return pathname.startsWith(href) && href !== '/loma-dashboard';
    };

    // Cerrar el menú móvil automáticamente cuando cambia la ruta
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);


    return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Abrir Menú</span>
              </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] p-0">
                <div className="flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-4 shrink-0">
                   <Link href="/loma-dashboard" className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-hover-foreground))]">
                      <LomaDevLogo className="h-6 w-auto" />
                   </Link>
                </div>
                <nav className="flex-grow overflow-y-auto px-4 py-4">
                  <ul className="space-y-1">
                    {lomaNavItems.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[hsl(var(--sidebar-hover-background))] hover:text-[hsl(var(--sidebar-hover-foreground))]",
                             isMobileMenuActive(item.href, item.exact)
                              ? "bg-[hsl(var(--sidebar-active-background))] text-[hsl(var(--sidebar-active-foreground))]" 
                              : "text-[hsl(var(--sidebar-foreground))]"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li className="pt-4 mt-4 border-t border-border">
                      <Link
                        href="/portal"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[hsl(var(--sidebar-hover-background))] hover:text-[hsl(var(--sidebar-hover-foreground))]"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Volver al Portal
                      </Link>
                    </li>
                  </ul>
                </nav>
              </SheetContent>
          </Sheet>
          
          <div className="hidden sm:block">
             <h1 className="font-semibold text-xl text-foreground">{pageTitle}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <SmartNotificationCenter />
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
                        <User className="h-5 w-5" />
                        <span className="sr-only">Abrir menú de usuario</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Accesos Rápidos</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsQrModalOpen(true)}>
                        <Smartphone className="mr-2 h-4 w-4" />
                        <span>Conectar Móvil (QR)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/capture')}>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        <span>LomaToolsCapture</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/manage-warranty')}>
                        <BookOpenCheck className="mr-2 h-4 w-4" />
                        <span>Admin. Garantías</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                           <Palette className="mr-2 h-4 w-4" />
                           <span>Tema</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                           <DropdownMenuSubContent>
                             <ThemeToggle />
                           </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                     </DropdownMenuSub>
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                           <Languages className="mr-2 h-4 w-4" />
                           <span>Idioma</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                           <DropdownMenuSubContent>
                             <LanguageToggle />
                           </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                     </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </header>
      <ShowQrCodeModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />
    </>
    );
}


export default function LomaDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <DashboardSidebar />
      <div className="flex flex-col sm:pl-64"> 
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 md:gap-8 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
