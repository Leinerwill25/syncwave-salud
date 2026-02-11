'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Link2,
  Copy,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import axios from 'axios';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LabUploadLinkPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<any>(null);
  const [fullUrl, setFullUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLink();
  }, []);

  const fetchLink = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Session check:', { hasSession: !!session, hasToken: !!token });

      if (!token) {
        console.error('No access token found');
        toast.error('No autenticado');
        return;
      }

      const res = await axios.get('/api/medic/lab-upload-link', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.exists) {
        setFullUrl(res.data.fullUrl);
        setLink(res.data.link);
      }
    } catch (err: any) {
      console.error('Error fetching link:', err);
      if (err.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        toast.error('Error al cargar link');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Generate link - Session check:', { hasSession: !!session, hasToken: !!token });

      if (!token) {
        console.error('No access token found');
        toast.error('No autenticado');
        return;
      }

      const res = await axios.post('/api/medic/lab-upload-link', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setFullUrl(res.data.fullUrl);
      setLink(res.data.link);
      toast.success('Link generado exitosamente');
    } catch (err: any) {
      console.error('Error generating link:', err);
      if (err.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        toast.error('Error al generar link');
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Link de Carga de Laboratorios
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Comparte este link con laboratorios externos para que carguen resultados
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">¿Cómo funciona?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Genera un link único para tu consultorio</li>
                <li>Comparte el link con laboratorios y centros médicos</li>
                <li>Los laboratorios pueden cargar resultados directamente</li>
                <li>Recibirás notificaciones de nuevos resultados para aprobar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Link Display */}
        {link ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Tu Link Público</h2>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Activo
              </span>
            </div>

            {/* URL Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">URL del Link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200 overflow-x-auto">
                  {fullUrl}
                </code>
                <Button
                  onClick={copyToClipboard}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => window.open(fullUrl, '_blank')}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-medium"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Abrir Link
              </Button>
              <Button
                onClick={generateLink}
                disabled={generating}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-5 h-5 mr-2" />
                )}
                Regenerar Link
              </Button>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Nota:</strong> Al regenerar el link, el anterior dejará de funcionar.
                Asegúrate de compartir el nuevo link con los laboratorios.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              No tienes un link generado
            </h2>
            <p className="text-slate-600 mb-6">
              Genera un link público para que los laboratorios puedan cargar resultados
            </p>
            <Button
              onClick={generateLink}
              disabled={generating}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5 mr-2" />
                  Generar Link
                </>
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
