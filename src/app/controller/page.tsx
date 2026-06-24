'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { createControllerRtc, ControllerRtc } from '@/utils/rtcLink';
import { PSCross, PSCircle, PSSquare, PSTriangle } from '@/components/PSGlyphs';
import { Gamepad, Wifi, WifiOff, Smartphone, User, Maximize, Zap } from 'lucide-react';

// Couleurs correspondant aux assignations du Dashboard
// Couleurs correspondant aux assignations du Dashboard
const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', label: 'Joueur 1' },
  { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', label: 'Joueur 2' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', label: 'Joueur 3' },
  { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', label: 'Joueur 4' },
];

interface ActionButtonConfig {
  defaultClass: string;
  activeClass: string;
  label: string;
  textClass: string;
}

interface ThemeConfig {
  id: string;
  name: string;
  preview: string;
  containerBg: string;
  containerStyle?: React.CSSProperties;
  panelClass: string;
  dpadPlateClass: string;
  centerCircleClass: string;
  btnDefaultClass: string;
  btnActiveClass: string;
  btnTextDefaultClass: string;
  btnTextActiveClass: string;
  lBtnDefaultClass: string;
  lBtnActiveClass: string;
  rBtnDefaultClass: string;
  rBtnActiveClass: string;
  actionButtons: {
    TRIANGLE: ActionButtonConfig;
    CONFIRM: ActionButtonConfig;
    SQUARE: ActionButtonConfig;
    BACK: ActionButtonConfig;
  };
  joystickTrackClass: string;
  joystickKnobClass: string;
  joystickDotDefaultClass: string;
  joystickDotActiveClass: string;
  customDecor?: React.ReactNode;
}

const THEME_CONFIGS: Record<string, ThemeConfig> = {
  'stealth-blue': {
    id: 'stealth-blue',
    name: 'Stealth Blue',
    preview: 'bg-gradient-to-r from-blue-650 to-indigo-900 border-blue-400',
    containerBg: '#020617',
    containerStyle: { backgroundImage: 'url(/images/themes/stealth-blue.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
    panelClass: 'bg-zinc-950/45 border-zinc-800/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
    dpadPlateClass: 'bg-zinc-950/60 border border-zinc-850 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_4px_8px_rgba(0,0,0,0.4)]',
    centerCircleClass: 'bg-zinc-900 border-zinc-850 shadow-inner',
    btnDefaultClass: 'bg-zinc-900 border-t border-l border-zinc-700/50 border-b-2 border-r-2 border-zinc-955 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.15)]',
    btnActiveClass: 'bg-blue-955/80 border-t border-l border-blue-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(59,130,246,0.6)]',
    btnTextDefaultClass: 'text-zinc-450 font-bold',
    btnTextActiveClass: 'text-blue-400 font-extrabold',
    lBtnDefaultClass: 'bg-zinc-900/80 border-x border-b-2 border-zinc-955 text-zinc-400 hover:text-white shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    lBtnActiveClass: 'bg-blue-500/20 border-x border-b-0 text-blue-350 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(59,130,246,0.4)]',
    rBtnDefaultClass: 'bg-zinc-900/80 border-x border-b-2 border-zinc-955 text-zinc-400 hover:text-white shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    rBtnActiveClass: 'bg-rose-500/20 border-x border-b-0 text-rose-350 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(244,63,94,0.4)]',
    actionButtons: {
      TRIANGLE: { defaultClass: 'bg-zinc-900 border-t border-l border-zinc-700/50 border-b-2 border-r-2 border-zinc-955 text-emerald-500/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.15)]', activeClass: 'bg-emerald-950/80 border-t border-l border-emerald-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-emerald-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(16,185,129,0.7)]', label: '▲', textClass: '' },
      CONFIRM: { defaultClass: 'bg-zinc-900 border-t border-l border-zinc-700/50 border-b-2 border-r-2 border-zinc-955 text-cyan-500/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.15)]', activeClass: 'bg-cyan-950/80 border-t border-l border-cyan-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-cyan-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.7)]', label: '✕', textClass: '' },
      SQUARE: { defaultClass: 'bg-zinc-900 border-t border-l border-zinc-700/50 border-b-2 border-r-2 border-zinc-955 text-purple-500/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.15)]', activeClass: 'bg-purple-955/80 border-t border-l border-purple-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-purple-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(168,85,247,0.7)]', label: '■', textClass: '' },
      BACK: { defaultClass: 'bg-zinc-900 border-t border-l border-zinc-700/50 border-b-2 border-r-2 border-zinc-955 text-rose-500/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.15)]', activeClass: 'bg-rose-955/80 border-t border-l border-rose-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-rose-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(244,63,94,0.7)]', label: '◯', textClass: '' }
    },
    joystickTrackClass: 'bg-zinc-955/60 border-zinc-850 shadow-inner',
    joystickKnobClass: 'from-zinc-700 to-zinc-900 border-zinc-650 shadow-md',
    joystickDotDefaultClass: 'bg-zinc-850',
    joystickDotActiveClass: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
  },
  'akatsuki': {
    id: 'akatsuki',
    name: 'Akatsuki',
    preview: 'bg-gradient-to-r from-red-650 to-black border-red-500',
    containerBg: '#050505',
    containerStyle: { backgroundImage: 'url(/images/themes/akatsuki.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
    panelClass: 'bg-black/60 border-red-955/50 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.7)]',
    dpadPlateClass: 'bg-black/70 border border-red-950 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_4px_8px_rgba(220,38,38,0.15)]',
    centerCircleClass: 'bg-zinc-955 border-red-955 shadow-inner',
    btnDefaultClass: 'bg-zinc-950 border-t border-l border-zinc-900 border-b-2 border-r-2 border-black text-zinc-550 shadow-[3px_3px_5px_rgba(0,0,0,0.7),inset_1px_1px_1px_rgba(255,255,255,0.02)]',
    btnActiveClass: 'bg-red-955/20 border-t border-l border-red-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.9),0_0_12px_rgba(220,38,38,0.8)]',
    btnTextDefaultClass: 'text-zinc-600',
    btnTextActiveClass: 'text-red-500 font-extrabold',
    lBtnDefaultClass: 'bg-zinc-955 border-x border-b-2 border-black text-zinc-550 shadow-[0_3px_6px_rgba(0,0,0,0.7)]',
    lBtnActiveClass: 'bg-red-955/35 border-x border-b-0 text-red-400 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_0_10px_rgba(220,38,38,0.5)]',
    rBtnDefaultClass: 'bg-zinc-955 border-x border-b-2 border-black text-zinc-555 shadow-[0_3px_6px_rgba(0,0,0,0.7)]',
    rBtnActiveClass: 'bg-red-955/35 border-x border-b-0 text-red-400 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_0_10px_rgba(220,38,38,0.5)]',
    actionButtons: {
      TRIANGLE: { defaultClass: 'bg-zinc-955 border-t border-l border-zinc-900 border-b-2 border-r-2 border-black text-red-900 shadow-[3px_3px_5px_rgba(0,0,0,0.7)]', activeClass: 'bg-red-955/25 border-t border-l border-red-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-red-500 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.9),0_0_12px_rgba(220,38,38,0.8)]', label: '▲', textClass: '' },
      CONFIRM: { defaultClass: 'bg-zinc-955 border-t border-l border-zinc-900 border-b-2 border-r-2 border-black text-red-900 shadow-[3px_3px_5px_rgba(0,0,0,0.7)]', activeClass: 'bg-red-955/25 border-t border-l border-red-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-red-500 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.9),0_0_12px_rgba(220,38,38,0.8)]', label: '✕', textClass: '' },
      SQUARE: { defaultClass: 'bg-zinc-955 border-t border-l border-zinc-900 border-b-2 border-r-2 border-black text-red-900 shadow-[3px_3px_5px_rgba(0,0,0,0.7)]', activeClass: 'bg-red-955/25 border-t border-l border-red-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-red-500 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.9),0_0_12px_rgba(220,38,38,0.8)]', label: '■', textClass: '' },
      BACK: { defaultClass: 'bg-zinc-955 border-t border-l border-zinc-900 border-b-2 border-r-2 border-black text-red-900 shadow-[3px_3px_5px_rgba(0,0,0,0.7)]', activeClass: 'bg-red-955/25 border-t border-l border-red-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-red-500 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.9),0_0_12px_rgba(220,38,38,0.8)]', label: '◯', textClass: '' }
    },
    joystickTrackClass: 'bg-black/80 border border-red-955/30 shadow-inner',
    joystickKnobClass: 'from-zinc-900 to-black border-red-955 shadow-md',
    joystickDotDefaultClass: 'bg-zinc-800',
    joystickDotActiveClass: 'bg-red-550 shadow-[0_0_8px_rgba(220,38,38,0.8)]'
  },
  'cr7': {
    id: 'cr7',
    name: 'CR7 Legend',
    preview: 'bg-gradient-to-r from-emerald-800 to-yellow-600 border-yellow-500',
    containerBg: '#020704',
    containerStyle: { backgroundImage: 'url(/images/themes/cr7.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
    panelClass: 'bg-emerald-950/40 border-yellow-500/20 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
    dpadPlateClass: 'bg-zinc-950/60 border border-yellow-600/30 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_4px_8px_rgba(234,179,8,0.1)]',
    centerCircleClass: 'bg-zinc-900 border-yellow-500/30 shadow-inner',
    btnDefaultClass: 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-t border-l border-yellow-300 border-b-2 border-r-2 border-yellow-800 text-zinc-900 shadow-[3px_3px_5px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.4)]',
    btnActiveClass: 'bg-gradient-to-br from-yellow-650 to-yellow-700 border-t border-l border-yellow-850 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(234,179,8,0.7)]',
    btnTextDefaultClass: 'text-yellow-950 font-black',
    btnTextActiveClass: 'text-white font-black',
    lBtnDefaultClass: 'bg-gradient-to-r from-emerald-800 to-emerald-900 border-x border-b-2 border-zinc-950 text-yellow-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    lBtnActiveClass: 'bg-yellow-500/20 border-x border-b-0 text-yellow-400 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_10px_rgba(234,179,8,0.4)]',
    rBtnDefaultClass: 'bg-gradient-to-r from-emerald-800 to-emerald-900 border-x border-b-2 border-zinc-950 text-yellow-500 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    rBtnActiveClass: 'bg-yellow-500/20 border-x border-b-0 text-yellow-400 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_10px_rgba(234,179,8,0.4)]',
    actionButtons: {
      TRIANGLE: { defaultClass: 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-t border-l border-yellow-300 border-b-2 border-r-2 border-yellow-800 text-yellow-950 shadow-[3px_3px_5px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.3)]', activeClass: 'bg-gradient-to-br from-yellow-650 to-yellow-700 border-t border-l border-yellow-850 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(234,179,8,0.7)]', label: '▲', textClass: '' },
      CONFIRM: { defaultClass: 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-t border-l border-yellow-300 border-b-2 border-r-2 border-yellow-800 text-yellow-950 shadow-[3px_3px_5px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.3)]', activeClass: 'bg-gradient-to-br from-yellow-650 to-yellow-700 border-t border-l border-yellow-850 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(234,179,8,0.7)]', label: '✕', textClass: '' },
      SQUARE: { defaultClass: 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-t border-l border-yellow-300 border-b-2 border-r-2 border-yellow-800 text-yellow-950 shadow-[3px_3px_5px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.3)]', activeClass: 'bg-gradient-to-br from-yellow-650 to-yellow-700 border-t border-l border-yellow-850 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(234,179,8,0.7)]', label: '■', textClass: '' },
      BACK: { defaultClass: 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-t border-l border-yellow-300 border-b-2 border-r-2 border-yellow-800 text-yellow-955 shadow-[3px_3px_5px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.3)]', activeClass: 'bg-gradient-to-br from-yellow-650 to-yellow-700 border-t border-l border-yellow-850 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(234,179,8,0.7)]', label: '◯', textClass: '' }
    },
    joystickTrackClass: 'bg-zinc-950/80 border border-yellow-555/20 shadow-inner',
    joystickKnobClass: 'from-zinc-800 to-zinc-955 border-yellow-555/30 shadow-md',
    joystickDotDefaultClass: 'bg-zinc-800',
    joystickDotActiveClass: 'bg-yellow-550 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
  },
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    preview: 'bg-gradient-to-r from-pink-500 to-cyan-500 border-pink-400',
    containerBg: '#09090b',
    containerStyle: { backgroundImage: 'url(/images/themes/cyberpunk.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
    panelClass: 'bg-black/60 border-pink-500/25 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
    dpadPlateClass: 'bg-zinc-950/60 border border-cyan-555/30 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_0_15px_rgba(6,182,212,0.15)]',
    centerCircleClass: 'bg-zinc-900 border border-pink-500/30 shadow-inner',
    btnDefaultClass: 'bg-zinc-955 border-t border-l border-cyan-500/30 border-b-2 border-r-2 border-zinc-955 text-cyan-450 shadow-[3px_3px_5px_rgba(0,0,0,0.6)]',
    btnActiveClass: 'bg-cyan-955/80 border-t border-l border-cyan-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.7)]',
    btnTextDefaultClass: 'text-cyan-500 font-bold',
    btnTextActiveClass: 'text-cyan-400 font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.5)]',
    lBtnDefaultClass: 'bg-zinc-950/90 border border-zinc-850 text-pink-500 shadow-[0_3px_6px_rgba(0,0,0,0.6)]',
    lBtnActiveClass: 'bg-pink-500/25 border border-pink-500/60 text-pink-400 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_10px_rgba(236,72,153,0.5)]',
    rBtnDefaultClass: 'bg-zinc-955/90 border border-zinc-850 text-cyan-500 shadow-[0_3px_6px_rgba(0,0,0,0.6)]',
    rBtnActiveClass: 'bg-cyan-500/25 border border-cyan-500/60 text-cyan-400 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_10px_rgba(6,182,212,0.5)]',
    actionButtons: {
      TRIANGLE: { defaultClass: 'bg-zinc-955 border-t border-l border-pink-500/30 border-b-2 border-r-2 border-zinc-955 text-pink-400 shadow-[3px_3px_5px_rgba(0,0,0,0.6)]', activeClass: 'bg-pink-955/25 border-t border-l border-pink-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-pink-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(236,72,153,0.7)]', label: '▲', textClass: '' },
      CONFIRM: { defaultClass: 'bg-zinc-955 border-t border-l border-cyan-500/30 border-b-2 border-r-2 border-zinc-955 text-cyan-400 shadow-[3px_3px_5px_rgba(0,0,0,0.6)]', activeClass: 'bg-cyan-955/25 border-t border-l border-cyan-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-cyan-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.7)]', label: '✕', textClass: '' },
      SQUARE: { defaultClass: 'bg-zinc-955 border-t border-l border-pink-500/30 border-b-2 border-r-2 border-zinc-955 text-pink-400 shadow-[3px_3px_5px_rgba(0,0,0,0.6)]', activeClass: 'bg-pink-955/25 border-t border-l border-pink-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-pink-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(236,72,153,0.7)]', label: '■', textClass: '' },
      BACK: { defaultClass: 'bg-zinc-955 border-t border-l border-cyan-500/30 border-b-2 border-r-2 border-zinc-955 text-cyan-400 shadow-[3px_3px_5px_rgba(0,0,0,0.6)]', activeClass: 'bg-cyan-955/25 border-t border-l border-cyan-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-cyan-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.7)]', label: '◯', textClass: '' }
    },
    joystickTrackClass: 'bg-zinc-950 border border-pink-500/20 shadow-inner',
    joystickKnobClass: 'from-zinc-900 to-zinc-955 border-cyan-500/30 shadow-md',
    joystickDotDefaultClass: 'bg-zinc-800',
    joystickDotActiveClass: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]'
  },
  'retro': {
    id: 'retro',
    name: 'Retro GB',
    preview: 'bg-gradient-to-r from-zinc-400 to-zinc-650 border-zinc-700',
    containerBg: '#c2c5ba',
    containerStyle: { backgroundImage: 'url(/images/themes/retro.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
    panelClass: 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
    dpadPlateClass: 'bg-zinc-300/80 border border-zinc-400 shadow-[inset_0_3px_8px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2)] text-zinc-800',
    centerCircleClass: 'bg-zinc-400 border border-zinc-500 shadow-inner',
    btnDefaultClass: 'bg-zinc-700 border-t border-l border-zinc-550 border-b-2 border-r-2 border-zinc-900 text-zinc-900 shadow-[2px_2px_4px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    btnActiveClass: 'bg-zinc-800 border-t border-l border-zinc-900 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_3px_rgba(0,0,0,0.7)]',
    btnTextDefaultClass: 'text-zinc-900 font-bold',
    btnTextActiveClass: 'text-white font-extrabold',
    lBtnDefaultClass: 'bg-zinc-500 border-x border-b-2 border-zinc-700 text-zinc-900 shadow-[0_3px_5px_rgba(0,0,0,0.4)]',
    lBtnActiveClass: 'bg-zinc-650 border-x border-b-0 text-white translate-y-[2px] shadow-inner',
    rBtnDefaultClass: 'bg-zinc-500 border-x border-b-2 border-zinc-700 text-zinc-900 shadow-[0_3px_5px_rgba(0,0,0,0.4)]',
    rBtnActiveClass: 'bg-zinc-655 border-x border-b-0 text-white translate-y-[2px] shadow-inner',
    actionButtons: {
      TRIANGLE: { defaultClass: 'bg-zinc-700 border-t border-l border-zinc-550 border-b-2 border-r-2 border-zinc-900 text-zinc-900 shadow-[2px_2px_4px_rgba(0,0,0,0.5)]', activeClass: 'bg-zinc-800 border-t border-l border-zinc-900 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_3px_rgba(0,0,0,0.7)]', label: '▲', textClass: '' },
      CONFIRM: { defaultClass: 'bg-red-700 border-t border-l border-red-500 border-b-2 border-r-2 border-red-950 text-white shadow-[2px_2px_4px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.2)]', activeClass: 'bg-red-850 border-t border-l border-red-950 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-zinc-300 shadow-[inset_2px_2px_3px_rgba(0,0,0,0.7)]', label: '✕', textClass: '' },
      SQUARE: { defaultClass: 'bg-zinc-700 border-t border-l border-zinc-550 border-b-2 border-r-2 border-zinc-900 text-zinc-900 shadow-[2px_2px_4px_rgba(0,0,0,0.5)]', activeClass: 'bg-zinc-800 border-t border-l border-zinc-900 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-white shadow-[inset_2px_2px_3px_rgba(0,0,0,0.7)]', label: '■', textClass: '' },
      BACK: { defaultClass: 'bg-red-700 border-t border-l border-red-500 border-b-2 border-r-2 border-red-955 text-white shadow-[2px_2px_4px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.25)]', activeClass: 'bg-red-850 border-t border-l border-red-955 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-zinc-300 shadow-[inset_2px_2px_3px_rgba(0,0,0,0.7)]', label: '◯', textClass: '' }
    },
    joystickTrackClass: 'bg-zinc-400 border border-zinc-500 shadow-inner',
    joystickKnobClass: 'from-zinc-650 to-zinc-800 border-zinc-700 shadow-md',
    joystickDotDefaultClass: 'bg-zinc-900',
    joystickDotActiveClass: 'bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.6)]'
  },
  'galactic': {
    id: 'galactic',
    name: 'Galactic',
    preview: 'bg-gradient-to-r from-purple-800 to-indigo-950 border-purple-400',
    containerBg: '#07021a',
    containerStyle: { backgroundImage: 'url(/images/themes/galactic.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
    panelClass: 'bg-purple-955/35 border-purple-800/30 backdrop-blur-md shadow-[0_8px_32px_rgba(139,92,246,0.15)]',
    dpadPlateClass: 'bg-zinc-950/60 border border-purple-900/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_4px_8px_rgba(139,92,246,0.2)]',
    centerCircleClass: 'bg-zinc-900 border-purple-900/30 shadow-inner',
    btnDefaultClass: 'bg-purple-950/60 border-t border-l border-purple-700/50 border-b-2 border-r-2 border-purple-955 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)]',
    btnActiveClass: 'bg-purple-900/80 border-t border-l border-purple-500 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(168,85,247,0.7)]',
    btnTextDefaultClass: 'text-purple-300 font-bold',
    btnTextActiveClass: 'text-purple-200 font-extrabold shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    lBtnDefaultClass: 'bg-purple-955/80 border-x border-b-2 border-purple-950 text-purple-400 hover:text-white shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    lBtnActiveClass: 'bg-purple-500/25 border-x border-b-0 text-purple-300 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(168,85,247,0.5)]',
    rBtnDefaultClass: 'bg-cyan-955/80 border-x border-b-2 border-cyan-950 text-cyan-400 hover:text-white shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_1px_1px_1px_rgba(255,255,255,0.1)]',
    rBtnActiveClass: 'bg-cyan-500/25 border-x border-b-0 text-cyan-300 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.5)]',
    actionButtons: {
      TRIANGLE: { defaultClass: 'bg-purple-950/60 border-t border-l border-purple-700/50 border-b-2 border-r-2 border-purple-950 text-purple-400/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)]', activeClass: 'bg-purple-900/80 border-t border-l border-purple-500 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-purple-200 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(168,85,247,0.7)]', label: '▲', textClass: '' },
      CONFIRM: { defaultClass: 'bg-cyan-950/60 border-t border-l border-cyan-700/50 border-b-2 border-r-2 border-cyan-950 text-cyan-400/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)]', activeClass: 'bg-cyan-900/80 border-t border-l border-cyan-500 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-cyan-200 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.7)]', label: '✕', textClass: '' },
      SQUARE: { defaultClass: 'bg-purple-955/60 border-t border-l border-purple-700/50 border-b-2 border-r-2 border-purple-955 text-purple-400/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)]', activeClass: 'bg-purple-900/80 border-t border-l border-purple-500 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-purple-200 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(168,85,247,0.7)]', label: '■', textClass: '' },
      BACK: { defaultClass: 'bg-cyan-955/60 border-t border-l border-cyan-700/50 border-b-2 border-r-2 border-cyan-955 text-cyan-400/80 shadow-[3px_3px_5px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)]', activeClass: 'bg-cyan-900/80 border-t border-l border-cyan-500 border-b-0 border-r-0 translate-y-[2px] translate-x-[1px] text-cyan-200 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.7)]', label: '◯', textClass: '' }
    },
    joystickTrackClass: 'bg-purple-955/40 border border-purple-800/30 shadow-inner',
    joystickKnobClass: 'from-zinc-900 to-purple-955 border-purple-800/40 shadow-md',
    joystickDotDefaultClass: 'bg-zinc-800',
    joystickDotActiveClass: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    customDecor: (
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 select-none">
        <div className="absolute w-2 h-2 bg-white rounded-full top-1/4 left-1/3 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute w-1 h-1 bg-white rounded-full top-2/3 left-1/4" />
        <div className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full top-1/3 left-2/3 animate-ping" style={{ animationDuration: '4s' }} />
        <div className="absolute w-1 h-1 bg-white rounded-full top-4/5 left-3/4" />
      </div>
    )
  }
};

const THEMES = Object.values(THEME_CONFIGS);

interface VirtualJoystickProps {
  side: 'LEFT' | 'RIGHT';
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
  theme: ThemeConfig;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ side, onMove, onEnd, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    setActive(true);
    updatePosition(e);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!active) return;
    updatePosition(e);
  };

  const handleEnd = () => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onEnd();
  };

  const updatePosition = (e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2 - 12;

    let targetX = dx;
    let targetY = dy;

    if (distance > maxRadius) {
      targetX = (dx / distance) * maxRadius;
      targetY = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: targetX, y: targetY });

    const normX = targetX / maxRadius;
    const normY = targetY / maxRadius;
    onMove(normX, normY);
  };

  useEffect(() => {
    if (!active) return;
    const handleGlobalEnd = () => {
      handleEnd();
    };
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      className={`w-20 h-20 rounded-full border shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] flex items-center justify-center relative touch-none select-none ${theme.joystickTrackClass}`}
    >
      <div className="absolute inset-0 rounded-full border border-blue-500/10 transition-opacity duration-300 opacity-0" />
      <div
        className={`w-8 h-8 rounded-full border shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center absolute transition-all duration-75 bg-gradient-to-br ${theme.joystickKnobClass}`}
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${active ? theme.joystickDotActiveClass : theme.joystickDotDefaultClass} transition-all`} />
      </div>
    </div>
  );
};

// ============================================================================
// Fullscreen Splash Gate
// ============================================================================
interface FullscreenGateProps {
  selectedTheme: string;
  onSelectTheme: (theme: string) => void;
  onEnter: () => void;
}

function FullscreenGate({ selectedTheme, onSelectTheme, onEnter }: FullscreenGateProps) {
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterFullscreen = async () => {
    try {
      // Request fullscreen on the document element
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen({ navigationUI: 'hide' });
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('[Controller] Fullscreen request failed:', e);
    }

    // Lock orientation to landscape
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
      }
    } catch (e) {
      console.warn('[Controller] Orientation lock failed:', e);
    }

    // Proceed regardless of fullscreen support
    onEnter();
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[999999] select-none overflow-y-auto py-6"
      style={{
        background: 'radial-gradient(circle at 30% 30%, rgba(0, 114, 206, 0.2) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(107, 33, 168, 0.2) 0%, transparent 50%), #020617',
      }}
    >
      {/* Animated rings */}
      <div className={`absolute w-96 h-96 rounded-full border border-blue-500/10 transition-all duration-[2000ms] ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
      <div className={`absolute w-72 h-72 rounded-full border border-purple-500/10 transition-all duration-[2000ms] delay-200 ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
      <div className={`absolute w-48 h-48 rounded-full border border-cyan-500/10 transition-all duration-[2000ms] delay-400 ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />

      {/* Gamepad icon */}
      <div className={`mb-2 transition-all duration-1000 ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)]">
          <Gamepad size={28} className="text-blue-400" />
        </div>
      </div>

      {/* Title */}
      <div className={`text-center mb-4 transition-all duration-1000 delay-300 ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <h1 className="text-xl font-extrabold tracking-[0.2em] bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase mb-0.5">
          Funny Station
        </h1>
        <p className="text-zinc-400 text-xs font-medium">Configurez votre manette</p>
      </div>

      {/* Theme Selection Grid */}
      <div className={`w-full max-w-md px-6 mb-6 transition-all duration-1000 delay-500 ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="text-center mb-2.5">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Choisir un Thème</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTheme(t.id)}
              className={`relative p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
                selectedTheme === t.id
                  ? 'border-white bg-white/10 scale-105 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                  : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700'
              }`}
            >
              <div className={`w-7 h-7 rounded-full border mb-1.5 ${t.preview} shadow-md flex items-center justify-center text-xs`}>
                {t.id === 'akatsuki' && <span>☁️</span>}
                {t.id === 'cr7' && <span className="font-black text-[9px] text-yellow-400">7</span>}
                {t.id === 'cyberpunk' && <span>⚡</span>}
                {t.id === 'retro' && <span>👾</span>}
                {t.id === 'galactic' && <span>✨</span>}
                {t.id === 'stealth-blue' && <span>🎮</span>}
              </div>
              <span className="text-[8px] font-black tracking-wider uppercase text-zinc-300 text-center">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enter button */}
      <button
        onClick={handleEnterFullscreen}
        className={`group relative px-8 py-3 rounded-2xl border-2 border-blue-500/50 bg-blue-500/10 backdrop-blur-sm hover:bg-blue-500/20 hover:border-blue-400 active:scale-95 transition-all duration-300 cursor-pointer ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        style={{ transitionDelay: '700ms' }}
      >
        <div className="flex items-center gap-2.5">
          <Maximize size={16} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-300 group-hover:text-white transition-colors">
            Appuyer pour connecter
          </span>
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-ping pointer-events-none" />
      </button>

      {/* Hint */}
      <p className={`mt-4 text-zinc-550 text-[8px] font-mono tracking-wider text-center max-w-xs transition-all duration-1000 delay-[900ms] ${animReady ? 'opacity-100' : 'opacity-0'}`}>
        L'orientation paysage et le plein écran seront activés automatiquement après la connexion.
      </p>
    </div>
  );
}

// ============================================================================
// Main Controller Content
// ============================================================================
function ControllerContent() {
  const searchParams = useSearchParams();
  const lobbyId = searchParams.get('lobbyId') || 'demo-lobby';
  // Runtime du jeu en cours → adapte DYNAMIQUEMENT le layout de la manette.
  // La console diffuse `game_context` (runtime du jeu lancé) sur le canal lobby ;
  // la manette s'adapte INSTANTANÉMENT, sans re-scanner le QR. La valeur d'URL n'est
  // qu'un repli au tout premier rendu. GBA/NES = 2 boutons (A/B) ; SNES = A/B/X/Y ;
  // autres (PSP/JS…) = layout PlayStation complet ✕◯■▲.
  const [runtime, setRuntime] = useState(searchParams.get('runtime') || '');
  const [gameTitle, setGameTitle] = useState('');
  const isGbaOrNes = runtime === 'gba' || runtime === 'nes';
  const isSnes = runtime === 'snes';
  // Chaque téléphone génère un ID unique stable (pas de userId dans l'URL pour le multi)
  const userIdRef = useRef(
    searchParams.get('userId') || `mobile-${Math.random().toString(36).substring(2, 9)}`
  );
  const userId = userIdRef.current;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [rtcOpen, setRtcOpen] = useState(false); // liaison P2P basse latence active ?
  const channelRef = useRef<any>(null);
  const rtcRef = useRef<ControllerRtc | null>(null);

  // Thème de la manette virtuelle
  const [activeTheme, setActiveTheme] = useState<string>('stealth-blue');

  // Charger le thème à partir du localStorage ou des paramètres d'URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryTheme = params.get('theme');
      if (queryTheme && THEME_CONFIGS[queryTheme]) {
        setActiveTheme(queryTheme);
        localStorage.setItem('funnystation_controller_theme', queryTheme);
        return;
      }
      const stored = localStorage.getItem('funnystation_controller_theme');
      if (stored && THEME_CONFIGS[stored]) {
        setActiveTheme(stored);
      }
    }
  }, []);

  const handleSelectTheme = (newTheme: string) => {
    setActiveTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('funnystation_controller_theme', newTheme);
    }
  };

  // Screen Wake Lock API pour empêcher l'écran du mobile de s'assombrir ou s'éteindre
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('[WakeLock] Verrou d\'activation de l\'écran activé.');
        }
      } catch (err) {
        console.warn('[WakeLock] Échec de l\'activation du Screen Wake Lock :', err);
      }
    };

    if (isFullscreen) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isFullscreen) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          console.log('[WakeLock] Verrou d\'activation de l\'écran relâché.');
        }).catch(() => {});
      }
    };
  }, [isFullscreen]);

  // Track fullscreen exit to re-show the gate
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isFS && isFullscreen) {
        // User exited fullscreen (e.g. swipe down on Android), don't reset gate
        // Just keep the controller visible but try to re-enter fullscreen on next touch
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Bloque le menu contextuel mobile (appui long → "imprimer / télécharger / enregistrer")
  // et la sélection de texte, pour que l'appui long sur une touche reste une commande.
  useEffect(() => {
    const preventContext = (e: Event) => e.preventDefault();
    const preventSelect = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('selectstart', preventSelect);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('selectstart', preventSelect);
    };
  }, []);

  // Cleanup: unlock orientation on unmount
  useEffect(() => {
    return () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch (e) {
        // Silently ignore
      }
      // Exit fullscreen on unmount
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } catch (e) {
        // Silently ignore
      }
    };
  }, []);

  // Initialisation du canal Supabase Realtime
  useEffect(() => {
    console.log(`[Mobile Controller] Connexion au salon: ${lobbyId} en tant que: ${userId}`);
    
    const channel = supabase.channel(`lobby:${lobbyId}`, {
      config: {
        // Latence minimale : pas d'écho local (self) ni d'attente d'accusé (ack)
        // → l'input part instantanément vers la console.
        broadcast: { self: false, ack: false },
        presence: { key: userId }
      }
    });

    channelRef.current = channel;

    // ── Liaison P2P (WebRTC) : signaling via ce canal, inputs en direct une fois ouverte.
    //    Repli transparent sur le broadcast si la négociation n'aboutit pas.
    const rtc = createControllerRtc(
      userId,
      (event, payload) => channel.send({ type: 'broadcast', event, payload }),
      (open) => setRtcOpen(open),
    );
    rtcRef.current = rtc;
    channel.on('broadcast', { event: 'rtc_answer' }, ({ payload }: any) => rtc.handleSignal('rtc_answer', payload));
    channel.on('broadcast', { event: 'rtc_ice' }, ({ payload }: any) => rtc.handleSignal('rtc_ice', payload));
    channel.on('broadcast', { event: 'rtc_console_ready' }, ({ payload }: any) => rtc.handleSignal('rtc_console_ready', payload));

    // Calcul de la latence (ping/pong)
    channel.on('broadcast', { event: 'ping' }, () => {
      channel.send({
        type: 'broadcast',
        event: 'pong',
        payload: { userId, timestamp: Date.now() }
      });
    });

    channel.on('broadcast', { event: 'latency_update' }, ({ payload }: any) => {
      if (payload.userId === userId) {
        setLatency(payload.latency);
      }
    });

    // Écouter les assignations de joueur envoyées par la console
    channel.on('broadcast', { event: 'player_assignment' }, ({ payload }: any) => {
      if (payload.userId === userId) {
        setPlayerNumber(payload.playerNumber);
        setTotalPlayers(payload.totalPlayers);
        console.log(`[Controller] Assigné comme Joueur ${payload.playerNumber + 1} sur ${payload.totalPlayers}`);
      }
    });

    // ── DÉTECTION DYNAMIQUE DU JEU : la console diffuse le runtime du jeu courant.
    //    La manette adapte INSTANTANÉMENT son layout (boutons actifs + labels) au
    //    bon système → plus aucun conflit de touches entre GBA / NES / SNES / autres.
    channel.on('broadcast', { event: 'game_context' }, ({ payload }: any) => {
      if (payload && typeof payload.runtime === 'string') {
        setRuntime(payload.runtime);
        if (payload.title) setGameTitle(payload.title);
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        // Si au moins un autre utilisateur (la console) est présent
        const hasConsole = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.type === 'console')
        );
        setConnected(hasConsole || keys.length > 1);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ 
            online_at: new Date().toISOString(),
            type: 'controller',
            userId
          });
          setSubscribed(true);
          // Mark as connected as soon as we successfully subscribe
          // (presence sync will refine this state later)
          setConnected(true);
          // Demande le contexte de jeu courant (la console répond par game_context)
          // → la manette s'adapte au bon système même si elle rejoint en pleine partie.
          channel.send({ type: 'broadcast', event: 'request_context', payload: { userId } });
          // Lance la négociation P2P dès que le canal est prêt.
          rtc.start();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSubscribed(false);
          setConnected(false);
          setRtcOpen(false);
        }
      });

    return () => {
      rtc.close();
      rtcRef.current = null;
      channel.unsubscribe();
    };
  }, [lobbyId, userId]);

  // Sons de toucher UI synthesiés (Web Audio API)
  const playTouchSound = useCallback((frequency = 600, duration = 0.08) => {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Web Audio non disponible:", e);
    }
  }, []);

  // Vibration haptique
  const triggerVibration = useCallback((ms = 40) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }, []);

  // Transmission des actions
  const sendAction = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'OPTION' | 'TRIANGLE' | 'SQUARE' | 'SELECT' | 'START' | 'L' | 'R', action: 'down' | 'up') => {
    if (action === 'down') {
      triggerVibration(25);
      
      // Déterminer la fréquence selon le bouton
      let freq = 500;
      if (direction === 'CONFIRM') freq = 650;
      else if (direction === 'BACK') freq = 420;
      else if (direction === 'SELECT') freq = 460;
      else if (direction === 'START') freq = 520;
      else if (direction === 'L') freq = 600;
      else if (direction === 'R') freq = 600;
      else if (direction === 'OPTION') freq = 800;
      else if (direction === 'TRIANGLE') freq = 700;
      else if (direction === 'SQUARE') freq = 580;
      playTouchSound(freq);

      setActiveButton(direction);
    } else {
      setActiveButton(prev => prev === direction ? null : prev);
    }

    const payload = {
      userId,
      direction,
      action,
      playerNumber: playerNumber !== null ? playerNumber : undefined,
      clientPlayerId: searchParams.get('clientPlayerId') || ''
    };

    // Chemin RAPIDE : liaison P2P si ouverte (latence minimale, pas de relais).
    const sentP2P = rtcRef.current?.send(payload) ?? false;
    // Repli : broadcast Supabase (toujours fiable).
    if (!sentP2P && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'controller_state', payload });
    }
  }, [userId, playerNumber, searchParams, triggerVibration, playTouchSound]);

  // Handlers d'un bouton « maintenable » avec CAPTURE DU POINTEUR : une fois l'appui
  // commencé, le bouton garde le pointeur même si le doigt glisse hors de sa zone.
  // → fini le `up` prématuré (qui coupait l'accélération/le virage quand le doigt
  // bougeait un peu pendant un appui prolongé). S'applique à TOUS les jeux.
  type Btn = Parameters<typeof sendAction>[0];
  const pressProps = useCallback((action: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
      sendAction(action, 'down');
    },
    onPointerUp: () => sendAction(action, 'up'),
    onPointerCancel: () => sendAction(action, 'up'),
  }), [sendAction]);

  const prevLeftAxes = useRef({ UP: false, DOWN: false, LEFT: false, RIGHT: false });
  const prevRightAxes = useRef({ TRIANGLE: false, CONFIRM: false, SQUARE: false, BACK: false });

  const handleLeftJoystickMove = useCallback((x: number, y: number) => {
    const threshold = 0.22; // seuil bas = joystick plus réactif (moins de course morte)
    const nextStates = {
      UP: y < -threshold,
      DOWN: y > threshold,
      LEFT: x < -threshold,
      RIGHT: x > threshold
    };

    (Object.keys(nextStates) as Array<keyof typeof nextStates>).forEach(dir => {
      const isPressed = nextStates[dir];
      const wasPressed = prevLeftAxes.current[dir];
      if (isPressed !== wasPressed) {
        prevLeftAxes.current[dir] = isPressed;
        sendAction(dir, isPressed ? 'down' : 'up');
      }
    });
  }, [sendAction]);

  const handleLeftJoystickEnd = useCallback(() => {
    (Object.keys(prevLeftAxes.current) as Array<keyof typeof prevLeftAxes.current>).forEach(dir => {
      if (prevLeftAxes.current[dir]) {
        prevLeftAxes.current[dir] = false;
        sendAction(dir, 'up');
      }
    });
  }, [sendAction]);

  const handleRightJoystickMove = useCallback((x: number, y: number) => {
    const threshold = 0.22; // seuil bas = joystick plus réactif (moins de course morte)
    const nextStates = {
      TRIANGLE: y < -threshold,
      CONFIRM: y > threshold,
      SQUARE: x < -threshold,
      BACK: x > threshold
    };

    (Object.keys(nextStates) as Array<keyof typeof nextStates>).forEach(dir => {
      const isPressed = nextStates[dir];
      const wasPressed = prevRightAxes.current[dir];
      if (isPressed !== wasPressed) {
        prevRightAxes.current[dir] = isPressed;
        sendAction(dir, isPressed ? 'down' : 'up');
      }
    });
  }, [sendAction]);

  const handleRightJoystickEnd = useCallback(() => {
    (Object.keys(prevRightAxes.current) as Array<keyof typeof prevRightAxes.current>).forEach(dir => {
      if (prevRightAxes.current[dir]) {
        prevRightAxes.current[dir] = false;
        sendAction(dir, 'up');
      }
    });
  }, [sendAction]);

  // Support clavier de secours pour test en Split-Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Éviter la répétition automatique du clavier
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          sendAction('UP', 'down');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          sendAction('DOWN', 'down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          sendAction('LEFT', 'down');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          sendAction('RIGHT', 'down');
          break;
        case ' ':
          sendAction('CONFIRM', 'down');
          break;
        case 'Backspace':
          sendAction('BACK', 'down');
          break;
        case 'o':
        case 'O':
          sendAction('OPTION', 'down');
          break;
        case 'Enter':
          sendAction('START', 'down');
          break;
        case 'Shift':
        case 'Tab':
          sendAction('SELECT', 'down');
          break;
        case 'l':
        case 'L':
          sendAction('L', 'down');
          break;
        case 'r':
        case 'R':
          sendAction('R', 'down');
          break;
        case 'i':
        case 'I':
          sendAction('TRIANGLE', 'down');
          break;
        case 'j':
        case 'J':
          sendAction('SQUARE', 'down');
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          sendAction('UP', 'up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          sendAction('DOWN', 'up');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          sendAction('LEFT', 'up');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          sendAction('RIGHT', 'up');
          break;
        case ' ':
          sendAction('CONFIRM', 'up');
          break;
        case 'Backspace':
          sendAction('BACK', 'up');
          break;
        case 'o':
        case 'O':
          sendAction('OPTION', 'up');
          break;
        case 'Enter':
          sendAction('START', 'up');
          break;
        case 'Shift':
        case 'Tab':
          sendAction('SELECT', 'up');
          break;
        case 'l':
        case 'L':
          sendAction('L', 'up');
          break;
        case 'r':
        case 'R':
          sendAction('R', 'up');
          break;
        case 'i':
        case 'I':
          sendAction('TRIANGLE', 'up');
          break;
        case 'j':
        case 'J':
          sendAction('SQUARE', 'up');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sendAction]);

  // Determine display status
  const isConnected = connected || subscribed;
  const playerColor = playerNumber !== null ? PLAYER_COLORS[playerNumber] : null;

  // =============================================
  // FULLSCREEN GATE — show splash until user taps
  // =============================================
  if (!isFullscreen) {
    return <FullscreenGate selectedTheme={activeTheme} onSelectTheme={handleSelectTheme} onEnter={() => setIsFullscreen(true)} />;
  }

  const currentTheme = THEME_CONFIGS[activeTheme] || THEME_CONFIGS['stealth-blue'];

  // =============================================
  // MAIN CONTROLLER UI (fullscreen)
  // =============================================
  return (
    <div 
      className="controller-landscape fixed inset-0 select-none overflow-hidden flex flex-col justify-between text-white"
      style={{
        width: '100vw',
        height: '100dvh',
        padding: 'env(safe-area-inset-top, 4px) env(safe-area-inset-right, 8px) env(safe-area-inset-bottom, 4px) env(safe-area-inset-left, 8px)',
        background: currentTheme.containerBg || undefined,
        ...currentTheme.containerStyle
      }}
    >
      {currentTheme.customDecor}
      
      {/* Compact Status Bar — minimal to save space */}
      <div className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border ${currentTheme.panelClass}`} style={{ flexShrink: 0, zIndex: 20 }}>
        <div className="flex items-center gap-2">
          {playerColor ? (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${playerColor.bg} ${playerColor.border} border`}>
              <User size={10} className={playerColor.text} />
              <span className={`text-[9px] uppercase tracking-widest font-black ${playerColor.text}`}>
                {playerColor.label}
              </span>
            </div>
          ) : (
            <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">
              Funny Station
            </span>
          )}
          {/* Console détectée dynamiquement (le layout s'y adapte en temps réel). */}
          {runtime && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/40">
              <Gamepad size={9} className="text-blue-400" />
              <span className="text-[8px] font-black uppercase tracking-wider text-blue-300">
                {({ gba: 'GBA', nes: 'NES', snes: 'SNES', psp: 'PSP', js: 'Jeu', wasm: 'WASM', python: 'Python', lua: 'Lua', java: 'Java' } as Record<string, string>)[runtime] || runtime.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {rtcOpen && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40">
              <Zap size={9} className="text-amber-400" />
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-400">Direct</span>
            </div>
          )}
          {latency > 0 && (
            <span className="text-[8px] font-mono text-zinc-500">{latency}ms</span>
          )}
          {isConnected ? (
            <div className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
              <Wifi size={10} />
              <span>OK</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-500 text-[9px] font-bold">
              <WifiOff size={10} className="animate-bounce" />
              <span>...</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION BOUTONS L & R (Gâchettes Épaules) */}
      <div className="w-full flex justify-between px-6" style={{ flexShrink: 0, zIndex: 20 }}>
        {/* BOUTON GAUCHE L */}
        <button
              {...pressProps('L')}
          className={`w-28 py-2.5 rounded-b-2xl border-x border-b transition-all duration-150 text-xs font-black uppercase tracking-widest text-center cursor-pointer ${
            activeButton === 'L'
              ? currentTheme.lBtnActiveClass
              : currentTheme.lBtnDefaultClass
          }`}
        >
          L
        </button>

        {/* BOUTON DROIT R */}
        <button
              {...pressProps('R')}
          className={`w-28 py-2.5 rounded-b-2xl border-x border-b transition-all duration-150 text-xs font-black uppercase tracking-widest text-center cursor-pointer ${
            activeButton === 'R'
              ? currentTheme.rBtnActiveClass
              : currentTheme.rBtnDefaultClass
          }`}
        >
          R
        </button>
      </div>

      {/* Zone du Gamepad principal — takes all available space */}
      <div className="flex-1 w-full flex items-center justify-between px-2 md:px-12 my-auto relative" style={{ minHeight: 0, zIndex: 20 }}>
        
        {/* SECTION GAUCHE : D-PAD + JOYSTICK GAUCHE */}
        <div className="flex flex-col items-center gap-2 select-none">
          <div className={`relative w-36 h-36 rounded-full flex items-center justify-center border shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${currentTheme.dpadPlateClass}`}>
            {/* Support Circulaire Central */}
            <div className={`absolute w-16 h-16 rounded-full border shadow-md z-10 flex items-center justify-center ${currentTheme.centerCircleClass}`}>
              <div className="w-8 h-8 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
                <Gamepad size={10} className="text-zinc-600" />
              </div>
            </div>

            {/* Boutons Directionnels */}
            {/* HAUT */}
            <button
              {...pressProps('UP')}
              className={`absolute top-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 border ${
                activeButton === 'UP'
                  ? currentTheme.btnActiveClass
                  : currentTheme.btnDefaultClass
              }`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'UP' ? currentTheme.btnTextActiveClass : currentTheme.btnTextDefaultClass}`}>▲</span>
            </button>

            {/* BAS */}
            <button
              {...pressProps('DOWN')}
              className={`absolute bottom-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 border ${
                activeButton === 'DOWN'
                  ? currentTheme.btnActiveClass
                  : currentTheme.btnDefaultClass
              }`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'DOWN' ? currentTheme.btnTextActiveClass : currentTheme.btnTextDefaultClass}`}>▼</span>
            </button>

            {/* GAUCHE */}
            <button
              {...pressProps('LEFT')}
              className={`absolute left-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 border ${
                activeButton === 'LEFT'
                  ? currentTheme.btnActiveClass
                  : currentTheme.btnDefaultClass
              }`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'LEFT' ? currentTheme.btnTextActiveClass : currentTheme.btnTextDefaultClass}`}>◀</span>
            </button>

            {/* DROITE */}
            <button
              {...pressProps('RIGHT')}
              className={`absolute right-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 border ${
                activeButton === 'RIGHT'
                  ? currentTheme.btnActiveClass
                  : currentTheme.btnDefaultClass
              }`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'RIGHT' ? currentTheme.btnTextActiveClass : currentTheme.btnTextDefaultClass}`}>▶</span>
            </button>
          </div>
          
          <VirtualJoystick side="LEFT" onMove={handleLeftJoystickMove} onEnd={handleLeftJoystickEnd} theme={currentTheme} />
        </div>

        {/* SECTION CENTRALE : SELECT / START / OPTIONS */}
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="text-center">
            <span className="text-[10px] font-extrabold tracking-[0.3em] bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent uppercase drop-shadow-[0_0_8px_rgba(0,114,206,0.3)]">
              Funny Station
            </span>
          </div>

          {/* Boutons Select, Start et Options */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-3">
              {/* SELECT */}
              <button
              {...pressProps('SELECT')}
                className={`px-3.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-black cursor-pointer ${
                  activeButton === 'SELECT'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Select</span>
              </button>

              {/* START */}
              <button
              {...pressProps('START')}
                className={`px-3.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-black cursor-pointer ${
                  activeButton === 'START'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Start</span>
              </button>
            </div>

            {/* Bouton central rond style PS5 (touche « PS »/Menu) avec le logo FS1. */}
            <button
              {...pressProps('OPTION')}
              aria-label="Menu Funny Station"
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-150 active:scale-90 cursor-pointer ${
                activeButton === 'OPTION'
                  ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.65)]'
                  : 'bg-zinc-900/70 border-zinc-700/60 hover:border-zinc-500 shadow-[0_2px_8px_rgba(0,0,0,0.55),inset_0_1px_2px_rgba(255,255,255,0.08)]'
              }`}
            >
              <img
                src="/fs1-logo.png"
                alt="FS"
                draggable={false}
                className="w-7 h-7 object-contain pointer-events-none select-none"
              />
            </button>

            {/* Sélecteur de Thèmes à la volée */}
            <div className="flex flex-col items-center gap-1 mt-1 bg-zinc-950/60 p-1.5 rounded-2xl border border-zinc-900/50 backdrop-blur-md">
              <span className="text-[7px] font-black tracking-widest text-zinc-500 uppercase">Thème</span>
              <div className="flex gap-1.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    title={t.name}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${t.preview} border active:scale-75 cursor-pointer ${
                      activeTheme === t.id ? 'ring-2 ring-white scale-110 border-white' : 'opacity-60 border-zinc-800 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION DROITE : BOUTONS D'ACTION + JOYSTICK DROIT */}
        <div className="flex flex-col items-center gap-2 select-none">
          <div className={`relative w-36 h-36 rounded-full flex items-center justify-center border shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${currentTheme.dpadPlateClass}`}>
            {/* Support Circulaire Central */}
            <div className={`absolute w-16 h-16 rounded-full border shadow-md z-10 flex items-center justify-center ${currentTheme.centerCircleClass}`}>
              <div className="w-8 h-8 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
                <span className="text-[6px] font-black tracking-widest text-zinc-500 uppercase">Action</span>
              </div>
            </div>

            {/* TRIANGLE (▲) */}
            <button
              disabled={isGbaOrNes}
              {...pressProps('TRIANGLE')}
              className={`absolute top-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 border-2 ${isGbaOrNes ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${
                activeButton === 'TRIANGLE'
                  ? currentTheme.actionButtons.TRIANGLE.activeClass
                  : currentTheme.actionButtons.TRIANGLE.defaultClass
              }`}
            >
              <span className="text-sm font-bold flex items-center justify-center">
                {isSnes ? 'X' : <PSTriangle size={15} />}
              </span>
            </button>

            {/* CROSS (✕) */}
            <button
              {...pressProps('CONFIRM')}
              className={`absolute bottom-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 border-2 cursor-pointer ${
                activeButton === 'CONFIRM'
                  ? currentTheme.actionButtons.CONFIRM.activeClass
                  : currentTheme.actionButtons.CONFIRM.defaultClass
              }`}
            >
              <span className="text-sm font-bold flex items-center justify-center">
                {isGbaOrNes ? 'A' : isSnes ? 'B' : <PSCross size={15} />}
              </span>
            </button>

            {/* SQUARE (■) */}
            <button
              disabled={isGbaOrNes}
              {...pressProps('SQUARE')}
              className={`absolute left-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 border-2 ${isGbaOrNes ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${
                activeButton === 'SQUARE'
                  ? currentTheme.actionButtons.SQUARE.activeClass
                  : currentTheme.actionButtons.SQUARE.defaultClass
              }`}
            >
              <span className="text-xs font-bold flex items-center justify-center">
                {isSnes ? 'Y' : <PSSquare size={13} />}
              </span>
            </button>

            {/* CIRCLE (◯) */}
            <button
              {...pressProps('BACK')}
              className={`absolute right-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 border-2 cursor-pointer ${
                activeButton === 'BACK'
                  ? currentTheme.actionButtons.BACK.activeClass
                  : currentTheme.actionButtons.BACK.defaultClass
              }`}
            >
              <span className="text-sm font-bold flex items-center justify-center">
                {isGbaOrNes ? 'B' : isSnes ? 'A' : <PSCircle size={14} />}
              </span>
            </button>
          </div>

          <VirtualJoystick side="RIGHT" onMove={handleRightJoystickMove} onEnd={handleRightJoystickEnd} theme={currentTheme} />
        </div>

      </div>

      {/* Empty bottom spacer to account for safe area */}
      <div style={{ flexShrink: 0, height: '2px' }} />

    </div>
  );
}

export default function MobileControllerPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
        <span className="text-xs text-zinc-400 uppercase tracking-widest">Initialisation...</span>
      </div>
    }>
      <ControllerContent />
    </Suspense>
  );
}
