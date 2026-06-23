'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resetPinAction } from '../actions';
import { signInClient, signUpClient } from '@/lib/authClient';
import { PRESET_AVATARS } from '@/shell/ProfileSpace';
import { AudioEngine } from '@/drivers/AudioEngine';
import { Delete, Check, ShieldCheck, Mail, AlertTriangle, ArrowLeft, UserPlus } from 'lucide-react';
import { BootScreen } from '@/shell/BootScreen';
import { supabase } from '@/utils/supabase/client';
import { WebGLBackground } from '@/drivers/WebGLBackground';

type Mode = 'profiles' | 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Liste des profils
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  // Champs partagés
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<'gamer' | 'creator'>('gamer');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);

  const sfx = (t: 'navigate' | 'select') => AudioEngine.getInstance().playSFX(t);

  // Charger tous les profils existants
  useEffect(() => {
    const loadAllProfiles = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, account_type')
          .order('username', { ascending: true });
        
        if (data && data.length > 0) {
          setProfiles(data);
          setMode('profiles');
        } else {
          setMode('signup');
        }
      } catch (err) {
        console.error('Erreur chargement profils:', err);
        setMode('signup');
      } finally {
        setProfilesLoaded(true);
      }
    };
    loadAllProfiles();
  }, []);

  const pressDigit = (d: string) => {
    if (pin.length >= 6) return;
    sfx('navigate');
    setPin((p) => p + d);
    setError('');
  };
  
  const backspace = () => {
    sfx('navigate');
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const goConsole = () => {
    sfx('select');
    router.push('/');
    router.refresh();
  };

  const handleLogin = async () => {
    if (!username.trim() || pin.length !== 6) {
      setError('Saisis ton pseudo et ton code PIN à 6 chiffres.');
      return;
    }
    setLoading(true);
    setError('');
    // Auth CÔTÉ NAVIGATEUR → session immédiate, redirection instantanée (pas de refresh).
    const res = await signInClient({ username, pin });
    setLoading(false);
    if (res.ok) goConsole();
    else {
      setError(res.error);
      setPin('');
    }
  };

  const handleSignup = async () => {
    if (!username.trim()) return setError('Choisis un pseudo.');
    if (pin.length !== 6) return setError('Choisis un code PIN à 6 chiffres.');
    setLoading(true);
    setError('');
    // signUpClient gère tout (création + session) en 1 aller → ultra rapide.
    const res = await signUpClient({ username, pin, email: email || undefined, accountType, avatarUrl: avatar });
    setLoading(false);
    if (res.ok) {
      goConsole();
      return;
    }
    if (res.error.toLowerCase().includes('déjà utilisé') || res.error.toLowerCase().includes('already')) {
      setError('Ce pseudo existe déjà. Si c\'est ton compte, connecte-toi avec ton PIN.');
      setMode('login');
      setPin('');
      return;
    }
    setError(res.error);
  };

  const handleForgot = async () => {
    if (!username.trim() || !email.trim() || pin.length !== 6) {
      setError('Renseigne ton pseudo, ton email de récupération et un nouveau PIN à 6 chiffres.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await resetPinAction({ username, recoveryEmail: email, newPin: pin });
    setLoading(false);
    if (res.ok) {
      setMode('login');
      setInfo('PIN réinitialisé ! Connecte-toi avec ton nouveau code.');
      setPin('');
      setEmail('');
    } else {
      setError(res.error);
    }
  };

  const submit = () => {
    if (mode === 'login') handleLogin();
    else if (mode === 'signup') handleSignup();
    else if (mode === 'forgot') handleForgot();
  };

  const switchMode = (m: Mode) => {
    sfx('select');
    setMode(m);
    setSelectedProfile(null);
    setError('');
    setInfo('');
    setPin('');
  };

  const title = 
    mode === 'profiles' ? 'Sélectionner un Profil' :
    mode === 'login' ? 'Connexion' : 
    mode === 'signup' ? 'Nouveau Profil' : 
    'PIN oublié';

  // Faut-il afficher le champ Pseudo ?
  // → mode signup, mode forgot : toujours
  // → mode login sans profil sélectionné : toujours (l'utilisateur tape manuellement)
  const showPseudoField = mode === 'signup' || mode === 'forgot' || (mode === 'login' && !selectedProfile);

  return (
    <BootScreen>
      <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 select-none relative z-10">
        <WebGLBackground />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,24,48,0.45)_0%,rgba(2,6,23,0.99)_80%)] -z-10 pointer-events-none" />

        <h1 className="text-3xl font-extralight tracking-widest mb-2 text-zinc-100 uppercase">
          FUNNY <span className="font-bold text-blue-500">STATION</span>
        </h1>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-8">{title}</p>

        {profilesLoaded && mode === 'profiles' ? (
          /* ───────── 1. SÉLECTEUR DE PROFILS STYLE PS5 ───────── */
          <div className="flex flex-col items-center gap-8 max-w-4xl w-full px-6 animate-fade-in">
            <h2 className="text-sm font-light text-zinc-400 tracking-wider uppercase">Qui utilise cette console ?</h2>
            
            <div className="flex flex-wrap items-center justify-center gap-8">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    sfx('select');
                    setSelectedProfile(p);
                    setUsername(p.username);
                    setPin('');
                    setError('');
                    setMode('login');
                  }}
                  onMouseEnter={() => sfx('navigate')}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:scale-110 group focus:outline-none"
                >
                  <div className="relative w-28 h-28 rounded-[2rem] overflow-hidden border border-zinc-800 shadow-xl group-hover:border-blue-500 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] group-active:scale-95 transition-all duration-300">
                    <img 
                      src={p.avatar_url || PRESET_AVATARS[0]} 
                      alt={p.username} 
                      className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300"
                    />
                    {p.account_type === 'creator' && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-purple-600/90 backdrop-blur-sm text-[8px] font-black tracking-widest text-white px-2 py-0.5 rounded-full uppercase shadow-md">
                        Créateur
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                    {p.username}
                  </span>
                </button>
              ))}

              {/* BOUTON AJOUTER UN PROFIL */}
              <button
                onClick={() => {
                  sfx('select');
                  setSelectedProfile(null);
                  setUsername('');
                  setPin('');
                  setError('');
                  setMode('signup');
                }}
                onMouseEnter={() => sfx('navigate')}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:scale-110 group focus:outline-none"
              >
                <div className="w-28 h-28 rounded-[2rem] bg-zinc-950/60 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-400 group-hover:border-blue-500 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] group-active:scale-95 transition-all duration-300">
                  <UserPlus size={36} className="stroke-[1.5]" />
                </div>
                <span className="text-xs font-bold tracking-wider text-zinc-500 group-hover:text-white transition-colors">
                  Nouveau Profil
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ───────── 2. FORMULAIRES SAISIE PIN / INSCRIPTION ───────── */
          <div className="glass-panel max-w-sm w-full p-7 rounded-3xl border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-5">
            
            {info && (
              <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-3 py-2 rounded-lg text-center animate-fade-in">
                {info}
              </div>
            )}

            {/* Avatar du profil sélectionné (mode login avec profil cliqué) */}
            {mode === 'login' && selectedProfile && (
              <div className="flex flex-col items-center gap-4 py-2 animate-fade-in">
                <div className="w-20 h-20 rounded-full overflow-hidden border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                  <img 
                    src={selectedProfile.avatar_url || PRESET_AVATARS[0]} 
                    alt={selectedProfile.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-sm font-bold tracking-wider text-zinc-100">{selectedProfile.username}</h2>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mt-0.5">
                    Saisis ton code PIN
                  </span>
                </div>
              </div>
            )}

            {/* Champ Pseudo — visible en signup, forgot, ET login sans profil sélectionné */}
            {showPseudoField && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Pseudo</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Pseudo de joueur"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500/50 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Avatar + type (inscription uniquement) */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Type de profil</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { sfx('select'); setAccountType('gamer'); }}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${accountType === 'gamer' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400'}`}>
                      Gamer
                    </button>
                    <button type="button" onClick={() => { sfx('select'); setAccountType('creator'); }}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${accountType === 'creator' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400'}`}>
                      Créateur
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Avatar</label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((url, idx) => (
                      <div key={idx} onClick={() => { sfx('select'); setAvatar(url); }}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${avatar === url ? 'border-blue-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Email (inscription = optionnel, récupération = requis) */}
            {(mode === 'signup' || mode === 'forgot') && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1.5">
                  <Mail size={11} />
                  {mode === 'signup' ? 'Email de récupération (optionnel)' : 'Email de récupération'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: toi@email.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500/50 focus:outline-none transition-colors"
                />
                {mode === 'signup' && !email.trim() && (
                  <span className="text-[9px] text-amber-500/90 flex items-center gap-1.5 mt-0.5">
                    <AlertTriangle size={10} />
                    Sans email, ton compte ne sera pas récupérable en cas d&#39;oubli de PIN.
                  </span>
                )}
              </div>
            )}

            {/* Affichage du PIN */}
            <div className="flex flex-col items-center gap-3">
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold self-start">
                {mode === 'forgot' ? 'Nouveau code PIN' : 'Code PIN'}
              </label>
              <div className="flex items-center justify-center gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-3.5 h-3.5 rounded-full border transition-all ${i < pin.length ? 'bg-blue-400 border-blue-400 scale-110 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'border-zinc-700 bg-zinc-950/40'}`} />
                ))}
              </div>

              {/* Pavé PIN console */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-[220px]">
                {['1','2','3','4','5','6','7','8','9'].map((n) => (
                  <button key={n} type="button" onClick={() => pressDigit(n)}
                    className="w-full h-12 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 active:scale-95 transition-all text-sm font-black text-zinc-200 cursor-pointer flex items-center justify-center">
                    {n}
                  </button>
                ))}
                <button type="button" onClick={backspace}
                  className="w-full h-12 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
                  <Delete size={14} />
                </button>
                <button type="button" onClick={() => pressDigit('0')}
                  className="w-full h-12 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 active:scale-95 transition-all text-sm font-black text-zinc-200 cursor-pointer flex items-center justify-center">
                  0
                </button>
                <button type="button" onClick={submit} disabled={loading}
                  className="w-full h-12 rounded-xl bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/20 text-blue-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50">
                  <Check size={14} />
                </button>
              </div>
            </div>

            {error && (
              <span className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg text-center animate-fade-in">
                {error}
              </span>
            )}

            {/* Bouton principal */}
            <button onClick={submit} disabled={loading}
              className="w-full py-3 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-black uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-950" />
                : mode === 'login' ? 'Se connecter'
                : mode === 'signup' ? <><ShieldCheck size={14} /> Créer & Connecter</>
                : 'Réinitialiser le PIN'}
            </button>

            {/* Liens de bascule */}
            <div className="flex flex-col items-center gap-2 pt-1">
              {mode === 'login' && (
                <>
                  {profiles.length > 0 && (
                    <button 
                      onClick={() => {
                        sfx('select');
                        setMode('profiles');
                        setSelectedProfile(null);
                        setPin('');
                        setError('');
                      }} 
                      className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold cursor-pointer flex items-center gap-1 mt-1 transition-colors"
                    >
                      <ArrowLeft size={11} /> Retour aux profils
                    </button>
                  )}
                  <button onClick={() => switchMode('signup')} className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-widest font-bold cursor-pointer">
                    Créer un nouveau profil
                  </button>
                  <button onClick={() => switchMode('forgot')} className="text-[9px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest cursor-pointer">
                    PIN oublié ?
                  </button>
                </>
              )}
              
              {(mode === 'signup' || mode === 'forgot') && (
                <button 
                  onClick={() => {
                    sfx('select');
                    if (profiles.length > 0) {
                      setMode('profiles');
                      setSelectedProfile(null);
                    } else {
                      setMode('login');
                    }
                    setError('');
                    setInfo('');
                    setPin('');
                  }} 
                  className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft size={11} /> {profiles.length > 0 ? 'Retour aux profils' : 'Retour à la connexion'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </BootScreen>
  );
}
