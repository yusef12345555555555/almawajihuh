// ============================================================
// أنت المدرب | ملف وهوية المدرب (Manager Profile & Custom Creation)
// ============================================================

import React, { useState } from 'react';
import { CoachManagerProfile } from '../../types/coachGameTypes';
import { User, Camera, Award, Shield, Check, Edit3 } from 'lucide-react';
import { audioManager } from '../../services/audioManager';

interface ManagerProfileEditorProps {
  manager: CoachManagerProfile;
  teamNameAr: string;
  onUpdateManager: (updated: CoachManagerProfile) => void;
}

export const ManagerProfileEditor: React.FC<ManagerProfileEditorProps> = ({
  manager,
  teamNameAr,
  onUpdateManager
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(manager.name);
  const [tempNationality, setTempNationality] = useState(manager.nationality);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        onUpdateManager({
          ...manager,
          photoUrl: result,
          isCustom: true
        });
        audioManager.playSuccess();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdateManager({
      ...manager,
      name: tempName.trim() || manager.name,
      nationality: tempNationality.trim() || manager.nationality,
      isCustom: true
    });
    setIsEditing(false);
    audioManager.playClick();
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm sm:text-base font-black text-white">بطاقة المدير الفني للفريق</h3>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-bold transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'إلغاء' : 'تخصيص هوية المدرب'}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Manager Photo / Avatar with upload button */}
        <div className="relative group flex-shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-lg bg-zinc-950 flex items-center justify-center">
            {manager.photoUrl ? (
              <img
                src={manager.photoUrl}
                alt={manager.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-zinc-600 flex flex-col items-center">
                <User className="w-10 h-10" />
                <span className="text-[9px] font-bold mt-1">مدرب</span>
              </div>
            )}
          </div>

          {/* Upload input overlay */}
          <label className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold">
            <Camera className="w-5 h-5 mb-1 text-amber-400" />
            <span>رفع صورتك</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Info & Stats */}
        <div className="flex-1 text-center sm:text-right space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1">اسم المدرب:</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full max-w-xs bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                  placeholder="أدخل اسمك كمدرب..."
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-black text-xs hover:bg-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h4 className="text-base font-black text-white">{manager.name}</h4>
                {manager.isCustom && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                    مدرب مخصص
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                المدير الفني لنادي <strong className="text-white">{teamNameAr}</strong> • الجنسية: {manager.nationality}
              </p>
            </>
          )}

          {/* Quick Metrics */}
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
            <div className="px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-500 text-[10px] block">تقييم المدرب</span>
              <span className="font-mono font-black text-amber-400">{manager.reputation} / 99</span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-500 text-[10px] block">البطولات</span>
              <span className="font-mono font-black text-emerald-400">{manager.trophiesWon} 🏆</span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-500 text-[10px] block">المباريات</span>
              <span className="font-mono font-black text-white">{manager.matchesManaged}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
