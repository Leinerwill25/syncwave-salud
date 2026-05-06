'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Users } from 'lucide-react';

interface DemographicItem {
  age_group: string;
  total: number;
}

interface DemographicsRankingProps {
  data: DemographicItem[];
}

export const DemographicsRanking: React.FC<DemographicsRankingProps> = ({ data }) => {
  const totalPatients = data.reduce((sum, item) => sum + item.total, 0);
  const maxPatients = Math.max(...data.map(item => item.total), 1);

  // Ordenar por edad o por cantidad? Por edad suele ser más lógico para demografía
  const sortedData = [...data].sort((a, b) => {
    const ageA = parseInt(a.age_group.split('-')[0]) || 0;
    const ageB = parseInt(b.age_group.split('-')[0]) || 0;
    return ageA - ageB;
  });

  return (
    <div className="space-y-6">
      {sortedData.map((item, index) => {
        const percentage = ((item.total / totalPatients) * 100).toFixed(1);
        const width = (item.total / maxPatients) * 100;

        return (
          <motion.div
            key={item.age_group}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-slate-100">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Rango: {item.age_group} años
                  </h4>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    {percentage}% de la población
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">{item.total}</span>
                <span className="text-[10px] text-slate-400 ml-1 font-bold">PACIENTES</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
              />
            </div>
          </motion.div>
        );
      })}

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
          <Users className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">No hay datos demográficos suficientes</p>
        </div>
      )}
    </div>
  );
};
