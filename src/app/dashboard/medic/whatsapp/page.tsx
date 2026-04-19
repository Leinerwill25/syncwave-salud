'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, RefreshCw, Power, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface WahaSession {
  status: 'PENDING' | 'STARTING' | 'SCAN_QR' | 'WORKING' | 'FAILED' | 'STOPPED';
  qrCode?: string;
}

export default function WhatsAppConfigPage() {
  const [session, setSession] = useState<WahaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/waha/session');
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error('Error fetching WAHA status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds if not working
    const interval = setInterval(() => {
      if (session?.status !== 'WORKING') {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, session?.status]);

  const handleStartSession = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/waha/session', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Iniciando sesión de WhatsApp...');
        fetchStatus();
      } else {
        toast.error(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('¿Estás seguro de cerrar la sesión de WhatsApp?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/waha/session', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Sesión cerrada');
        fetchStatus();
      } else {
        toast.error(data.error || 'Error al cerrar sesión');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (session?.status) {
      case 'WORKING':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Conectado</Badge>;
      case 'SCAN_QR':
        return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Esperando QR</Badge>;
      case 'STARTING':
      case 'PENDING':
        return <Badge className="bg-blue-500 text-white animate-pulse">Iniciando...</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Error</Badge>;
      case 'STOPPED':
        return <Badge variant="outline">Desconectado</Badge>;
      default:
        return <Badge variant="secondary">Cargando...</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-8 text-slate-800">
        <div className="p-3 bg-green-100 rounded-xl text-green-600">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integración WhatsApp</h1>
          <p className="text-slate-500">Automatiza recordatorios y confirmaciones de citas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Status Card */}
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-xl">Estado de Conexión</CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>
              Vincula tu cuenta de WhatsApp para permitir que la IA gestione tus citas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              {(session?.status?.includes('QR') || session?.status === 'STARTING') && session?.qrCode ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl shadow-lg mb-4 inline-block">
                    <img src={session.qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-2 flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4" /> Escanea con tu celular
                  </p>
                  <p className="text-xs text-slate-400">WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo</p>
                </div>
              ) : session?.status === 'WORKING' ? (
                <div className="text-center">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">¡Todo Listo!</h3>
                  <p className="text-sm text-slate-500">Tu asistente virtual está activo y respondiendo.</p>
                </div>
              ) : (
                <div className="text-center py-6">
                   <Power className={`w-16 h-16 ${session?.status === 'STOPPED' ? 'text-slate-300' : 'text-blue-500 animate-pulse'}`} />
                   <p className="mt-4 text-slate-500">Sin conexión activa</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {session?.status === 'WORKING' ? (
              <Button 
                variant="outline" 
                className="w-full text-red-500 border-red-200 hover:bg-red-50"
                onClick={handleLogout}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                Desconectar WhatsApp
              </Button>
            ) : (
              <>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleStartSession}
                  disabled={actionLoading || session?.status === 'STARTING'}
                >
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {session?.status?.includes('QR') ? 'Recargar QR' : 'Conectar WhatsApp'}
                </Button>
                
                {(session?.status === 'STARTING' || session?.status === 'SCAN_QR' || session?.status === 'FAILED') && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-400 hover:text-red-500 text-xs"
                    onClick={handleLogout}
                    disabled={actionLoading}
                  >
                    Detener y Limpiar (Reset)
                  </Button>
                )}
              </>
            )}
          </CardFooter>
        </Card>

        {/* Benefits/Tips Card */}
        <Card className="bg-slate-900 border-none text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <MessageSquare className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle>¿Cómo funciona?</CardTitle>
            <CardDescription className="text-slate-400">
              Nuestra tecnología basada en IA automatiza tu agenda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 bg-white/5 p-4 rounded-xl">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 h-fit">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Recordatorios Automáticos</h4>
                <p className="text-xs text-slate-400 mt-1">Enviamos mensajes 24h antes de cada cita para reducir ausentismo.</p>
              </div>
            </div>
            
            <div className="flex gap-4 bg-white/5 p-4 rounded-xl">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 h-fit">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Confirmación Inteligente</h4>
                <p className="text-xs text-slate-400 mt-1">La IA entiende si el paciente dice "sí", "claro", "no puedo", etc. y actualiza tu agenda.</p>
              </div>
            </div>

            <div className="flex gap-4 bg-white/5 p-4 rounded-xl">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 h-fit">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Protección Anti-Ban</h4>
                <p className="text-xs text-slate-400 mt-1">Simulamos comportamiento humano (escritura, pausas) para proteger tu número.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-[11px] text-slate-500 italic">
              * El servicio requiere que mantengas tu teléfono con conexión a internet estable.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
