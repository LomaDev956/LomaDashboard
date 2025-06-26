
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Settings, BookOpenCheck, Briefcase, Image as ImageIcon } from 'lucide-react'; 
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  title: string;
  icon: ReactNode;
  homePath?: string;
}

export function AppHeader({ title, icon, homePath = '/' }: AppHeaderProps) {
  return (
    <header className="bg-secondary text-secondary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link href={homePath} passHref>
            <div className="flex items-center gap-2 cursor-pointer">
              {icon}
              <h1 className="text-2xl font-bold font-headline">{title}</h1>
            </div>
          </Link>
        </div>
        <div>
          <Menubar className="bg-transparent border-none text-secondary-foreground">
            <MenubarMenu>
              <MenubarTrigger asChild className="cursor-pointer hover:bg-secondary/80 focus:bg-secondary/70 data-[state=open]:bg-secondary/70">
                <Button variant="ghost" size="icon" aria-label="Menú Principal">
                  <Settings className="h-5 w-5" />
                </Button>
              </MenubarTrigger>
              <MenubarContent>
                 <MenubarItem asChild>
                  <Link href="/loma-dashboard" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Dashboard LOMA
                  </Link>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem asChild>
                  <Link href="/capture" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Captura de Imágenes
                  </Link>
                </MenubarItem>
                 <MenubarItem asChild>
                  <Link href="/manage-warranty" className="flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4" />
                    Administrar Reglas de Garantía
                  </Link>
                </MenubarItem>
                <MenubarItem asChild>
                  <Link href="/settings">Ajustes de Captura</Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>
    </header>
  );
}
