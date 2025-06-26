
"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react" 
import { useTheme } from "next-themes"

import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <>
      <DropdownMenuItem onClick={() => setTheme("light")}>
        <Sun className="mr-2 h-4 w-4" />
        Claro
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>
        <Moon className="mr-2 h-4 w-4" />
        Oscuro (Milwaukee)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("theme-camclick")}> {/* Updated to 'theme-camclick' */}
        <Palette className="mr-2 h-4 w-4" /> 
        Azul Medianoche
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")}>
        <Moon className="mr-2 h-4 w-4" /> 
        Sistema
      </DropdownMenuItem>
    </>
  )
}
