
import React, { useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface ProfileViewProps {
  user: User;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    description: user.description || '',
    industry: user.industry || '',
    website: user.website || '',
  });

  const handleSave = async () => {
    try {
      await apiService.updateProfile(formData);
      setIsEditing(false);
      // In a real app, we'd trigger a global user state update
      window.location.reload(); 
    } catch (error) {
      console.error('Failed to update profile', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
        
        {/* Header Cover */}
        <div className="h-64 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(26,26,26,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-full p-12 flex justify-between items-end">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold mb-2 block">Institutional Identity</span>
              <h2 className="text-5xl font-serif italic text-ink dark:text-paper tracking-tight">Profile Dossier</h2>
            </div>
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="border border-accent text-accent px-8 py-3 rounded-none font-bold transition-all hover:bg-accent hover:text-white uppercase tracking-widest text-[10px]"
            >
              {isEditing ? 'Commit Changes' : 'Modify Dossier'}
            </button>
          </div>
        </div>
        
        <div className="p-12">
          <div className="flex flex-col md:flex-row gap-12">
            {/* Avatar */}
            <div className="w-full md:w-1/3">
              <div className="relative aspect-square overflow-hidden border border-zinc-100 dark:border-zinc-800">
                <img src={user.avatar} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" alt={user.name} />
                <div className="absolute inset-0 border border-ink/5 dark:border-paper/5"></div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-800">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Status</span>
                  <span className="text-accent font-serif italic text-sm">Verified Elite</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-800">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Access Level</span>
                  <span className="text-ink dark:text-paper font-serif italic text-sm">Institutional</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-12">
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-accent font-bold mb-4 block">Core Information</span>
                {isEditing ? (
                  <div className="space-y-6">
                    <input 
                      className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 outline-none focus:border-accent font-serif italic text-3xl text-ink dark:text-paper"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Entity Name"
                    />
                    <div className="flex items-center gap-4">
                       <span className="bg-accent/10 text-accent px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-accent/20">{user.role}</span>
                       <input 
                        className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1 outline-none focus:border-accent font-serif italic text-lg text-zinc-500"
                        value={formData.industry}
                        onChange={e => setFormData({...formData, industry: e.target.value})}
                        placeholder="Industry Sector"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-4xl font-serif italic text-ink dark:text-paper mb-2">{user.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                       <span className="bg-accent/10 text-accent px-3 py-1 text-[9px] font-bold uppercase tracking-widest border border-accent/20">{user.role}</span>
                       <span className="text-zinc-400 font-serif italic text-lg">/ {user.industry}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-[1px] w-full bg-zinc-50 dark:bg-zinc-800/50"></div>

              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-accent font-bold mb-6 block">Strategic Narrative</span>
                {isEditing ? (
                  <textarea 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800 p-8 outline-none focus:border-accent h-48 resize-none font-serif italic text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe your institutional vision..."
                  />
                ) : (
                  <p className="text-zinc-500 dark:text-zinc-400 font-serif italic text-2xl leading-relaxed">
                    "{user.description}"
                  </p>
                )}
              </div>

              <div className="pt-10">
                <div className="grid grid-cols-2 gap-8">
                   <div className="border border-zinc-100 dark:border-zinc-800 p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent/20"></div>
                      <span className="block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-3">Network Trust</span>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-serif italic text-ink dark:text-paper">98.4</span>
                        <span className="text-[10px] uppercase font-bold text-accent mb-1.5">%</span>
                      </div>
                   </div>
                   <div className="border border-zinc-100 dark:border-zinc-800 p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent/20"></div>
                      <span className="block text-[9px] text-zinc-400 uppercase tracking-widest font-bold mb-3">Sector Dominance</span>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-serif italic text-ink dark:text-paper">Tier 1</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
