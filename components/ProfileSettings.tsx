'use client';

import { useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { User } from '@prisma/client';
import { updateProfile, changePassword } from '@/actions/profile';
import { Camera, Lock, User as UserIcon, Save, Loader2 } from 'lucide-react';
import { getAvatarColor } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';

interface ProfileSettingsProps {
    user: Omit<User, 'createdAt'> & { createdAt: string | Date };
}

const initialState = {
    message: '',
    type: '' as 'success' | 'error' | '',
};

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    Kaydediliyor...
                </>
            ) : (
                <>
                    <Save size={18} />
                    {text}
                </>
            )}
        </button>
    );
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
    const [previewImage, setPreviewImage] = useState<string | null>(user.image || null);
    const [imageFile, setImageFile] = useState<string | null>(null); // Base64 string for hidden input
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profileState, profileAction] = useFormState(updateProfile, initialState);
    const [passwordState, passwordAction] = useFormState(changePassword, initialState);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Removing 2MB limit check here because logic is now:
        // 1. User selects ANY image (e.g. 10MB)
        // 2. We compress it to <50KB
        // 3. We upload that.
        // So strict file size check on INPUT is less critical, but good to keep a sane upper limit like 20MB to prevent browser crash.
        if (file.size > 20 * 1024 * 1024) {
            alert('Dosya çok büyük.');
            return;
        }

        try {
            // Force 200x200 roughly for profile
            const compressedBase64 = await compressImage(file, {
                maxWidth: 200,
                maxHeight: 200,
                quality: 0.8
            });

            setPreviewImage(compressedBase64);
            setImageFile(compressedBase64);
        } catch (error) {
            console.error('Image compression failed', error);
            alert('Fotoğraf işlenirken bir hata oluştu.');
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'info'
                        ? 'bg-white/10 text-white border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <UserIcon size={18} />
                    Kişisel Bilgiler
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'security'
                        ? 'bg-white/10 text-white border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Lock size={18} />
                    Güvenlik
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'info' && (
                    <form action={profileAction} className="space-y-6">
                        {/* Profile Photo */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className={`w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shadow-xl bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center`}>
                                    {previewImage ? (
                                        <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-bold text-white">{user.username?.[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white" size={24} />
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                                name="file_dummy" // Dummy name, handled via JS state -> hidden input
                            />
                            <input type="hidden" name="image" value={imageFile || ''} />
                            <p className="text-xs text-gray-500">Fotoğrafı değiştirmek için tıklayın (Max 2MB)</p>
                        </div>

                        {/* Info Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Kullanıcı Adı</label>
                                <input
                                    type="text"
                                    value={`@${user.username}`}
                                    disabled
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Kullanıcı adı değiştirilemez.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">E-posta</label>
                                <input
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label htmlFor="bio" className="block text-xs font-medium text-gray-400 mb-1">Hakkımda</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    maxLength={100}
                                    defaultValue={user.bio || ''}
                                    onChange={(e) => {
                                        // Optional: You could manage state here if you wanted a live counter, 
                                        // but for simplicity we can just use the DOM or a simple state if we convert this to controlled.
                                        // Let's make it simple controlled for the counter.
                                        const counter = document.getElementById('bio-counter');
                                        if (counter) counter.innerText = `${e.target.value.length}/100`;
                                    }}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors min-h-[100px] resize-none"
                                    placeholder="Kendinizden bahsedin..."
                                />
                                <p id="bio-counter" className="text-[10px] text-gray-500 text-right mt-1">
                                    {(user.bio?.length || 0)}/100
                                </p>
                            </div>

                            {/* Privacy Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div>
                                    <h3 className="font-medium text-white flex items-center gap-2">
                                        <Lock size={16} className="text-purple-400" />
                                        İtiraflarımı Gizle
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">İtiraflarınız profilinizde sadece size görünür.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="hideEntries"
                                        value="true"
                                        defaultChecked={user.hideEntries}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>

                        {profileState.message && (
                            <div className={`p-4 rounded-xl text-sm ${profileState.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {profileState.message}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <SubmitButton text="Değişiklikleri Kaydet" />
                        </div>
                    </form>
                )}

                {activeTab === 'security' && (
                    <form action={passwordAction} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="currentPassword" className="block text-xs font-medium text-gray-400 mb-1">Mevcut Şifre</label>
                                <input
                                    id="currentPassword"
                                    name="currentPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label htmlFor="newPassword" className="block text-xs font-medium text-gray-400 mb-1">Yeni Şifre</label>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-400 mb-1">Yeni Şifre (Tekrar)</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {passwordState.message && (
                            <div className={`p-4 rounded-xl text-sm ${passwordState.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {passwordState.message}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <SubmitButton text="Şifreyi Güncelle" />
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
