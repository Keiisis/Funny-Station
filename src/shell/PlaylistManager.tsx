'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Music, Plus, Trash2, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, PlusCircle, CheckCircle, Disc } from 'lucide-react';
import { fetchPlaylists, createPlaylist, deletePlaylist, fetchTracks, addTrack, removeTrack, fetchGameMusics } from '@/lib/playlists';
import type { Playlist, PlaylistTrack } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';

interface PlaylistManagerProps {
  userId: string;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({ userId }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [gameMusics, setGameMusics] = useState<{ title: string; url: string; artist: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // New Playlist Form
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New Track Form
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [isAddingTrack, setIsAddingTrack] = useState(false);

  // Media Player State
  const [playingQueue, setPlayingQueue] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userPlaylists, osts] = await Promise.all([
        fetchPlaylists(userId),
        fetchGameMusics()
      ]);
      setPlaylists(userPlaylists);
      setGameMusics(osts);
    } catch (e) {
      console.error('[Playlist] Failed loading:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Load tracks when playlist selection changes
  useEffect(() => {
    const loadPlaylistTracks = async () => {
      if (!selectedPlaylist) {
        setTracks([]);
        return;
      }
      try {
        const data = await fetchTracks(selectedPlaylist.id);
        setTracks(data);
      } catch (err) {
        console.error('[Playlist] Failed loading tracks:', err);
      }
    };
    loadPlaylistTracks();
  }, [selectedPlaylist]);

  // Audio elements management & sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      handleNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playingQueue, currentTrackIndex]);

  // Volume synchronization
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Trigger track playing when index changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && currentTrackIndex < playingQueue.length && audioRef.current) {
      const track = playingQueue[currentTrackIndex];
      audioRef.current.src = track.url;
      if (isPlaying) {
        // Mute FunnyStation background music to prevent overlap
        AudioEngine.getInstance().stopAmbientMusic();
        audioRef.current.play().catch(e => console.warn('[Player] Auto-play blocked:', e));
      }
    }
  }, [currentTrackIndex, playingQueue]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      AudioEngine.getInstance().playSFX('select');
      const data = await createPlaylist(newPlaylistName.trim());
      setPlaylists(prev => [data, ...prev]);
      setNewPlaylistName('');
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette playlist ?')) return;

    try {
      AudioEngine.getInstance().playSFX('select');
      await deletePlaylist(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylist || !trackTitle.trim() || !trackUrl.trim()) return;

    try {
      AudioEngine.getInstance().playSFX('select');
      const trackData = await addTrack(selectedPlaylist.id, {
        title: trackTitle.trim(),
        artist: trackArtist.trim() || 'Artiste inconnu',
        url: trackUrl.trim()
      });

      setTracks(prev => [...prev, trackData]);
      setTrackTitle('');
      setTrackArtist('');
      setTrackUrl('');
      setIsAddingTrack(false);

      // Refresh playlist track counts
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTrack = async (id: string) => {
    try {
      AudioEngine.getInstance().playSFX('select');
      await removeTrack(id);
      setTracks(prev => prev.filter(t => t.id !== id));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Music Player Commands
  const handlePlayPause = () => {
    if (!audioRef.current || playingQueue.length === 0) return;
    AudioEngine.getInstance().playSFX('select');

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      AudioEngine.getInstance().stopAmbientMusic();
      audioRef.current.play().catch(e => console.error(e));
      setIsPlaying(true);
    }
  };

  const handlePlayTrackDirectly = (trackList: any[], startIndex: number) => {
    setPlayingQueue(trackList);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (playingQueue.length === 0) return;

    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error(e));
      }
      return;
    }

    let nextIndex = currentTrackIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playingQueue.length);
    } else if (nextIndex >= playingQueue.length) {
      nextIndex = 0;
    }

    setCurrentTrackIndex(nextIndex);
  };

  const handlePrev = () => {
    if (playingQueue.length === 0) return;

    let prevIndex = currentTrackIndex - 1;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * playingQueue.length);
    } else if (prevIndex < 0) {
      prevIndex = playingQueue.length - 1;
    }

    setCurrentTrackIndex(prevIndex);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleStartRadio = () => {
    if (gameMusics.length === 0) {
      alert("Aucune musique de jeu trouvée.");
      return;
    }
    AudioEngine.getInstance().playSFX('select');
    
    // Shuffle GameMusics list
    const shuffled = [...gameMusics].sort(() => Math.random() - 0.5);
    handlePlayTrackDirectly(shuffled, 0);
  };

  const currentTrack = currentTrackIndex >= 0 && currentTrackIndex < playingQueue.length ? playingQueue[currentTrackIndex] : null;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-pink-400" /> Lecteur & Playlists
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Créez vos playlists ou écoutez la radio des bandes sonores des jeux de FunnyStation</p>
        </div>
        <button
          onClick={handleStartRadio}
          className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md shadow-pink-600/10 flex items-center gap-2"
        >
          <Shuffle className="w-4 h-4" /> Lancer la Radio OST
        </button>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Playlists Left Shelf */}
        <div className="flex flex-col gap-4 bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Mes Playlists</h3>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* New Playlist Form */}
          {isCreating && (
            <form onSubmit={handleCreatePlaylist} className="flex gap-2 animate-in slide-in-from-top-1 duration-150">
              <input
                type="text"
                placeholder="Nom de la playlist..."
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-white/10 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="px-3 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-500"
              >
                Créer
              </button>
            </form>
          )}

          {playlists.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500 italic">Aucune playlist créée</div>
          ) : (
            <div className="flex flex-col gap-1">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => setSelectedPlaylist(playlist)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedPlaylist?.id === playlist.id
                      ? 'bg-pink-600/10 border-pink-500/25 text-pink-400'
                      : 'bg-white/0 border-transparent hover:bg-white/5 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Music className="w-4 h-4" />
                    <div>
                      <div className="text-xs font-bold leading-tight">{playlist.name}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{playlist.track_count || 0} pistes</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tracks List Shelf */}
        <div className="md:col-span-2 flex flex-col gap-4 bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
          {selectedPlaylist ? (
            <>
              {/* Selected Playlist Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedPlaylist.name}</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{tracks.length} pistes</p>
                </div>
                <div className="flex gap-2">
                  {tracks.length > 0 && (
                    <button
                      onClick={() => handlePlayTrackDirectly(tracks, 0)}
                      className="p-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Lire la playlist
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddingTrack(!isAddingTrack)}
                    className="p-1.5 border border-white/10 hover:bg-white/5 text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Ajouter une piste
                  </button>
                </div>
              </div>

              {/* Add Track Form */}
              {isAddingTrack && (
                <form onSubmit={handleAddTrack} className="bg-zinc-950 border border-white/5 p-4 rounded-xl flex flex-col gap-3 animate-in slide-in-from-top-2 duration-150">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Main Theme"
                        value={trackTitle}
                        onChange={e => setTrackTitle(e.target.value)}
                        className="bg-zinc-900 border border-white/5 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Artiste</label>
                      <input
                        type="text"
                        placeholder="Ex: Koji Kondo"
                        value={trackArtist}
                        onChange={e => setTrackArtist(e.target.value)}
                        className="bg-zinc-900 border border-white/5 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">URL audio (mp3 / webm / ogg)</label>
                    <input
                      type="url"
                      placeholder="Ex: https://example.com/song.mp3"
                      value={trackUrl}
                      onChange={e => setTrackUrl(e.target.value)}
                      className="bg-zinc-900 border border-white/5 focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingTrack(false)}
                      className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-500"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}

              {/* Tracks list */}
              {tracks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 italic text-xs">Cette playlist est vide. Ajoutez des liens musicaux pour commencer !</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {tracks.map((track, i) => (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrackDirectly(tracks, i)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer border hover:border-pink-500/25 transition-all ${
                        currentTrack?.id === track.id
                          ? 'bg-pink-600/10 border-pink-500/20 text-pink-400'
                          : 'bg-white/0 border-transparent hover:bg-white/5 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-500 flex items-center justify-center font-bold text-[10px]">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{track.title}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{track.artist}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrack(track.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 italic text-xs gap-3">
              <Disc className="w-10 h-10 text-zinc-600 animate-pulse" />
              <span>Sélectionnez une playlist à gauche ou lancez la Radio OST</span>
            </div>
          )}
        </div>

      </div>

      {/* Embedded Premium Music Player Bar */}
      {playingQueue.length > 0 && currentTrack && (
        <div className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-3 duration-300">
          
          {/* Left Panel: Track Info */}
          <div className="flex items-center gap-3 w-full md:w-1/3">
            <div className="relative w-12 h-12 bg-zinc-800 rounded-full border border-white/10 flex items-center justify-center text-pink-400 overflow-hidden shadow-lg animate-spin" style={{ animationDuration: isPlaying ? '6s' : '0s' }}>
              <Disc className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight line-clamp-1">{currentTrack.title}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{currentTrack.artist}</div>
            </div>
          </div>

          {/* Middle Panel: Controls & Progress */}
          <div className="flex flex-col items-center gap-2 w-full md:w-1/2">
            
            {/* Control buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 rounded transition-colors ${isShuffle ? 'text-pink-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={handlePrev} className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-2.5 bg-white text-zinc-950 rounded-full hover:scale-105 transition-transform flex items-center justify-center shadow-lg"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />}
              </button>
              <button onClick={handleNext} className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1.5 rounded transition-colors ${isRepeat ? 'text-pink-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Time progress bar */}
            <div className="w-full flex items-center gap-2.5 text-[10px] text-zinc-400 font-medium">
              <span>{new Date(progress * 1000).toISOString().substr(14, 5)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleProgressChange}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
            </div>

          </div>

          {/* Right Panel: Volume */}
          <div className="flex items-center gap-2 w-full md:w-1/6 justify-end">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

        </div>
      )}
    </div>
  );
};
