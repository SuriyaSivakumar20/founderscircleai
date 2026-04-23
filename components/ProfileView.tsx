import React, { useState } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface ProfileViewProps {
  user: User;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const [formData, setFormData] = useState({
    name: user.name,
    description: user.description || '',
    industry: user.industry || '',
    website: user.website || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      await apiService.updateProfile(formData);
      setLocalUser({ ...localUser, ...formData });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setLocalUser({ ...localUser, ...formData });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header section outside the main card */}
      <div className="flex justify-between items-end mb-6">
         <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">My Profile</h1>
            <p className="text-slate-500">Manage your platform identity and visibility settings.</p>
         </div>
         <button 
           onClick={() => isEditing ? handleSave() : setIsEditing(true)}
           disabled={isSaving}
           className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 shadow-sm"
         >
           {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
         </button>
      </div>

      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cover Photo Area */}
        <div className="h-48 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
        </div>
        
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-8 relative -mt-16">
            
            {/* Left Column: Avatar & Quick Stats */}
            <div className="w-full md:w-1/3 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-[#0f172a] bg-white overflow-hidden shadow-sm mb-6 shrink-0 relative group">
                <img src={localUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${localUser.name}`} className="w-full h-full object-cover" alt={localUser.name} />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Change</span>
                  </div>
                )}
              </div>
              
              <div className="w-full space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                   <div className="flex justify-between items-center mb-3">
                     <span className="text-sm font-semibold text-slate-500">Profile Status</span>
                     <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500 text-xs px-2 py-1 rounded-md font-bold">100% Complete</span>
                   </div>
                   <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                     <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                   <div className="flex justify-between items-center text-sm">
                     <span className="font-semibold text-slate-500">Account Type</span>
                     <span className="font-bold text-slate-900 dark:text-white capitalize">{localUser.role.toLowerCase()}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="font-semibold text-slate-500">Member Since</span>
                     <span className="font-bold text-slate-900 dark:text-white">Oct 2024</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex-1 space-y-8 pt-16 md:pt-20">
              
              {/* Basic Info */}
              <div>
                {isEditing ? (
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name / Entity Name</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 transition-colors dark:text-white"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Industry Sector</label>
                        <input 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 transition-colors dark:text-white"
                          value={formData.industry}
                          onChange={e => setFormData({...formData, industry: e.target.value})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Website</label>
                        <input 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 transition-colors dark:text-white"
                          value={formData.website}
                          onChange={e => setFormData({...formData, website: e.target.value})}
                          placeholder="https://"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{localUser.name}</h2>
                    <div className="flex items-center gap-3 text-slate-500 font-medium">
                       <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-md text-sm">{localUser.industry}</span>
                       {localUser.website && (
                          <a href={`https://${localUser.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                             Website
                          </a>
                       )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>

              {/* Bio/Description */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">About</h3>
                {isEditing ? (
                  <textarea 
                    className="w-full max-w-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors min-h-[160px] resize-y dark:text-white"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                ) : (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    {localUser.description || "No description provided."}
                  </p>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
