"use client";

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Bot, Send, User as UserIcon, Loader2, Mic } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { getHerramientasList, updateHerramienta, type Herramienta } from '@/lib/herramientas-storage';
import { getPersonalList, type Personal } from '@/lib/personal-storage';
import { 
    getListasGarantia, 
    addListaGarantia, 
    type ListaGarantia,
    type ArticuloGarantia, 
    type ListaGarantiaEstado 
} from '@/lib/garantias-storage';
import { inventoryAssistant, type InventoryAssistantInput, type InventoryAssistantOutput } from '@/ai/flows/inventoryAssistantFlow';

// For Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function InventoryAssistantChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // States for Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const initialMessages: Message[] = [
        { role: 'assistant', content: '¡Hola! Soy Karielo, tu asistente. Puedo responder preguntas, crear listas de garantía o actualizar herramientas. ¿En qué te puedo ayudar?' }
    ];
    setMessages(initialMessages);
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setIsSpeechRecognitionSupported(true);
    }
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleListen = () => {
    if (!isSpeechRecognitionSupported) {
      toast({ title: "No Soportado", description: "El reconocimiento de voz no es compatible con tu navegador.", variant: "destructive"});
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'es-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      toast({ title: "Escuchando...", description: "Habla ahora."});
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
        let errorMsg = "Ocurrió un error en el reconocimiento de voz.";
        if (event.error === 'not-allowed') {
            errorMsg = "Permiso para usar el micrófono denegado. Habilítalo en los ajustes del navegador.";
        } else if (event.error === 'no-speech') {
            errorMsg = "No se detectó voz. Inténtalo de nuevo.";
        }
        toast({ title: "Error de Voz", description: errorMsg, variant: "destructive" });
        setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };


  const handleClientSideAction = async (action: InventoryAssistantOutput) => {
    try {
        if (action.name === 'createWarrantyList') {
            const { toolIds, personalId, notes } = action.parameters;
            const articulosGarantia: ArticuloGarantia[] = toolIds.map(id => ({ herramientaId: id }));
            const nuevaListaData = {
                articulos: articulosGarantia,
                personalId: personalId,
                fechaCreacion: new Date().toISOString(),
                estado: "En Preparación" as ListaGarantiaEstado,
                notas: notes?.trim() || undefined,
            };
            const success = await addListaGarantia(nuevaListaData);
            if (success) {
                const allLists = await getListasGarantia();
                const newListName = allLists.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())[0]?.nombreLista || "la nueva lista";
                setMessages(prev => [...prev, { role: 'assistant', content: `¡Listo! He creado la lista de garantía "${newListName}" con ${toolIds.length} herramienta(s).` }]);
                toast({ title: "Acción Completada", description: `Se ha creado la lista de garantía ${newListName}.`});
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error y no pude crear la lista de garantía. Por favor, inténtalo desde la interfaz de "Crear Lista".' }]);
                toast({ title: "Error de Acción", description: "No se pudo guardar la lista de garantía en la base de datos.", variant: "destructive" });
            }
        } else if (action.name === 'updateTool') {
            const { toolId, updates } = action.parameters;
            const allTools = await getHerramientasList();
            const toolToUpdate = allTools.find(t => t.id === toolId);

            if (!toolToUpdate) {
                setMessages(prev => [...prev, { role: 'assistant', content: `No encontré ninguna herramienta con el ID ${toolId} para actualizar.` }]);
                return;
            }
            
            const updatedToolData: Herramienta = { ...toolToUpdate, ...updates };
            const success = await updateHerramienta(updatedToolData);
            
            if (success) {
                setMessages(prev => [...prev, { role: 'assistant', content: `¡Perfecto! He actualizado la herramienta "${updatedToolData.toolName}" (ID: ${toolId}).` }]);
                toast({ title: "Acción Completada", description: `Se ha actualizado la herramienta ${toolToUpdate.toolName}.`});
            } else {
                 setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error y no pude actualizar la herramienta en la base de datos.' }]);
                 toast({ title: "Error de Acción", description: "No se pudo guardar la actualización de la herramienta.", variant: "destructive" });
            }
        } else {
             setMessages(prev => [...prev, { role: 'assistant', content: 'Recibí una acción desconocida y no pude procesarla.' }]);
        }
    } catch (error) {
        console.error("Error executing client-side action:", error);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Ocurrió un error inesperado al intentar ejecutar la acción.' }]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const [herramientas, personal, listasGarantia] = await Promise.all([
        getHerramientasList(),
        getPersonalList(),
        getListasGarantia(),
      ]);
      
      const assistantInput: InventoryAssistantInput = {
        query: input,
        herramientas,
        personal,
        listasGarantia
      };

      const result = await inventoryAssistant(assistantInput);
      
      if (result.name === 'textResponse') {
        const assistantMessage: Message = { role: 'assistant', content: result.parameters.content };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        await handleClientSideAction(result);
      }

    } catch (error) {
      console.error("Error calling inventory assistant:", error);
      const errorMessage = 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      toast({
        title: "Error del Asistente",
        description: "No se pudo obtener una respuesta del asistente de IA.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] max-h-[70vh] shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
                <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle>Asistente Karielo</CardTitle>
                <CardDescription>Haz preguntas o pide crear listas y actualizar herramientas en lenguaje natural.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="p-2 bg-muted rounded-full">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "p-3 rounded-lg max-w-[80%] whitespace-pre-wrap",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {message.content}
                </div>
                 {message.role === 'user' && (
                  <div className="p-2 bg-muted rounded-full">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                 <div className="p-2 bg-muted rounded-full">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                <div className="p-3 bg-muted rounded-lg flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje o usa el micrófono..."
            disabled={isLoading}
            autoComplete="off"
          />
          {isSpeechRecognitionSupported && (
            <Button type="button" size="icon" variant={isListening ? "destructive" : "outline"} onClick={handleListen} disabled={isLoading}>
                <Mic className="h-4 w-4" />
                <span className="sr-only">Grabar voz</span>
            </Button>
          )}
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
             <span className="sr-only">Enviar mensaje</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
