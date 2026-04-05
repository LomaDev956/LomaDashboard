"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Database, CheckCircle, AlertCircle, Brain, Target } from 'lucide-react';
import { getWarrantyLearningStats } from '@/lib/warranty-learning-storage';
import { getKnowledgeBaseStats } from '@/lib/catno-knowledge-base';

interface LearningStatsProps {
  className?: string;
}

export function WarrantyLearningStats({ className }: LearningStatsProps) {
  const [learningStats, setLearningStats] = useState<{
    totalEntries: number;
    uniqueCatNos: number;
    averageAccuracy: number;
    topCorrectedCatNos: { catNo: string; corrections: number }[];
  } | null>(null);
  
  const [knowledgeStats, setKnowledgeStats] = useState<{
    totalCatNos: number;
    verifiedCatNos: number;
    mostUsedCatNos: { catNo: string; toolName: string; usageCount: number }[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [learning, knowledge] = await Promise.all([
        getWarrantyLearningStats(),
        getKnowledgeBaseStats()
      ]);
      setLearningStats(learning);
      setKnowledgeStats(knowledge);
    } catch (error) {
      console.error('Error loading warranty learning stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Estadísticas de Aprendizaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const verificationRate = knowledgeStats && knowledgeStats.totalCatNos > 0 
    ? (knowledgeStats.verifiedCatNos / knowledgeStats.totalCatNos) * 100 
    : 0;

  const accuracyPercentage = learningStats 
    ? learningStats.averageAccuracy * 100 
    : 0;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Learning Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Aprendizaje Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Correcciones totales</span>
                  <span className="font-semibold">{learningStats?.totalEntries || 0}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>CAT.NO. únicos</span>
                  <span className="font-semibold">{learningStats?.uniqueCatNos || 0}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Precisión promedio</span>
                  <span className="font-semibold">{accuracyPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={accuracyPercentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Base de Conocimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Total CAT.NO.</span>
                  <span className="font-semibold">{knowledgeStats?.totalCatNos || 0}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Verificados</span>
                  <Badge variant={verificationRate > 70 ? "default" : "secondary"} className="text-xs">
                    {knowledgeStats?.verifiedCatNos || 0}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Tasa de verificación</span>
                  <span className="font-semibold">{verificationRate.toFixed(1)}%</span>
                </div>
                <Progress value={verificationRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {accuracyPercentage >= 80 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  {accuracyPercentage >= 80 ? 'Sistema optimizado' : 'Necesita más entrenamiento'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {verificationRate >= 70 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  {verificationRate >= 70 ? 'Base de datos confiable' : 'Verificar más CAT.NO.'}
                </span>
              </div>

              <div className="pt-2">
                <Badge 
                  variant={accuracyPercentage >= 80 && verificationRate >= 70 ? "default" : "secondary"}
                  className="w-full justify-center"
                >
                  {accuracyPercentage >= 80 && verificationRate >= 70 ? 'Excelente' : 'En desarrollo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Corrected CAT.NO.s */}
      {learningStats && learningStats.topCorrectedCatNos.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">CAT.NO. Más Corregidos</CardTitle>
            <CardDescription className="text-xs">
              Los productos que más correcciones han recibido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {learningStats.topCorrectedCatNos.slice(0, 4).map((item, index) => (
                <div key={index} className="text-center p-2 bg-muted rounded-lg">
                  <div className="font-semibold text-sm">{item.catNo}</div>
                  <div className="text-xs text-muted-foreground">{item.corrections} correcciones</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}