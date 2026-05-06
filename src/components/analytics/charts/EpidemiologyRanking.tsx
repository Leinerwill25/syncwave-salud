'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronRight } from 'lucide-react';

interface DiagnosisItem {
  diagnosis: string;
  count: number;
}

interface EpidemiologyRankingProps {
  data: DiagnosisItem[];
}

export const EpidemiologyRanking: React.FC<EpidemiologyRankingProps> = ({ data }) => {
  const totalCases = data.reduce((sum, item) => sum + item.count, 0);
  const maxCases = Math.max(...data.map(item => item.count), 1);

  return (
    <div className="space-y-6">
      {data.map((item, index) => {
        const percentage = ((item.count / totalCases) * 100).toFixed(1);
        const width = (item.count / maxCases) * 100;

        return (
          <motion.div
            key={item.diagnosis}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-slate-100">
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {item.diagnosis}
                  </h4>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    {percentage}% de incidencia
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900">{item.count}</span>
                  <span className="text-[10px] text-slate-400 ml-1 font-medium">CASOS</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            
            {/* Progress Bar Container */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
              />
            </div>
          </motion.div>
        );
      })}

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Activity className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">No hay diagnósticos registrados</p>
        </div>
      )}
    </div>
  );
};
