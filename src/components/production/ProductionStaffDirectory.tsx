import React from 'react';
import { Users, Mail, Phone, MapPin, Tag, Shield, CheckCircle, Award } from 'lucide-react';
import { useRole } from '../RoleContext';

export interface ProductionStaffDirectoryProps {
  searchTerm: string;
}

export const ProductionStaffDirectory: React.FC<ProductionStaffDirectoryProps> = ({ searchTerm }) => {
  const { staff = [] } = useRole();

  const prodStaffList = (staff || []).filter(s => {
    const matchesDept = s.department === 'Production' || 
      (s.role && (s.role.toLowerCase().includes('editor') || s.role.toLowerCase().includes('production') || s.role.toLowerCase().includes('album')));
    
    const q = (searchTerm || '').toLowerCase();
    const nameMatch = (s.name || '').toLowerCase().includes(q);
    const roleMatch = (s.role || '').toLowerCase().includes(q);
    const specMatch = (s.production_role_speciality || '').toLowerCase().includes(q);

    return matchesDept && (!q || nameMatch || roleMatch || specMatch);
  });

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Production Editors & Design Team ({prodStaffList.length})</span>
        </h3>
      </div>

      {prodStaffList.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl space-y-2">
          <Users className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-400 font-medium text-sm">No production editors found matching search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prodStaffList.map(member => (
            <div key={member.staff_id} className="bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 rounded-2xl p-4 space-y-3 transition-all shadow-xl">
              <div className="flex items-start justify-between gap-2 border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold flex items-center justify-center text-base">
                    {member.name ? member.name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{member.name}</h4>
                    <span className="text-xs text-purple-400 font-bold block">{member.role || 'Production Specialist'}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {member.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-300">
                {member.production_role_speciality && (
                  <p className="flex items-center gap-1.5 text-zinc-300">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Speciality: {member.production_role_speciality}</span>
                  </p>
                )}
                {member.mobile && (
                  <p className="flex items-center gap-1.5 text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{member.mobile}</span>
                  </p>
                )}
                {member.email && (
                  <p className="flex items-center gap-1.5 text-zinc-400 truncate">
                    <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
