
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Settings, PanelLeft, Search as SearchIcon, LogIn, LogOut, Wrench, Users as UsersIcon, ListPlus, ShieldCheck, Package, CircleSlash, Bell, Palette, Sun, Moon, Tv2, Briefcase, BookOpenCheck, ShoppingCart, Image as ImageIcon
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean; 
}

const lomaNavItems: NavItem[] = [
  { href: '/loma-dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/loma-dashboard/personal', icon: UsersIcon, label: 'Personal' },
  { href: '/loma-dashboard/herramientas', icon: Wrench, label: 'Herramientas' },
  { href: '/loma-dashboard/garantias', icon: ListPlus, label: 'Crear Lista Garantía' },
  { href: '/loma-dashboard/lista-garantias', icon: ShieldCheck, label: 'Listas de Garantías' },
  { href: '/loma-dashboard/stock', icon: Package, label: 'Stock (Reparados)' },
  { href: '/loma-dashboard/rechazados', icon: CircleSlash, label: 'Rechazados' },
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
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] sm:flex">
      <div className="flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-4 shrink-0">
        <Link href="/loma-dashboard" className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-hover-foreground))]">
          <Briefcase className="h-7 w-7 text-[hsl(var(--primary))]" />
          <span className="font-bold">LOMA Tools</span>
        </Link>
      </div>
      <nav className="flex-grow overflow-y-auto px-4 py-4">
        <ul className="space-y-1">
          {lomaNavItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[hsl(var(--sidebar-hover-background))] hover:text-[hsl(var(--sidebar-hover-foreground))]",
                  isActive(item.href, item.exact) 
                    ? "bg-[hsl(var(--sidebar-active-background))] text-[hsl(var(--sidebar-active-foreground))]" 
                    : "text-[hsl(var(--sidebar-foreground))]"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.href, item.exact) && "text-[hsl(var(--sidebar-active-foreground))]")} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}


function DashboardHeader() {
    const pathname = usePathname();
    const { toast } = useToast();
    
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


    return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Sheet>
            <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir Menú</span>
            </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] p-0">
              <div className="flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-4 shrink-0">
                 <Link href="/loma-dashboard" className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-hover-foreground))]">
                    <Briefcase className="h-7 w-7 text-[hsl(var(--primary))]" />
                    <span className="font-bold">LOMA Tools</span>
                 </Link>
              </div>
              <nav className="flex-grow overflow-y-auto px-4 py-4">
                <ul className="space-y-1">
                  {lomaNavItems.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
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
                </ul>
              </nav>
            </SheetContent>
        </Sheet>
        
        <div className="hidden sm:block">
           <h1 className="font-semibold text-xl text-foreground">{pageTitle}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src="https://placehold.co/40x40.png" alt="Usuario" data-ai-hint="user avatar"/>
                          <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Accesos Rápidos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                     <Link href="/capture" className="flex items-center">
                       <ImageIcon className="mr-2 h-4 w-4" />LomaToolsCapture
                     </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                     <Link href="/manage-warranty" className="flex items-center">
                       <BookOpenCheck className="mr-2 h-4 w-4" />Admin. Garantías
                     </Link>
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
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </header>
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

    