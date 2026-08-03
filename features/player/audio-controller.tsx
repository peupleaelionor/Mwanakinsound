'use client';

import { useEffect, useRef } from 'react';
import { dataPolicyFor, emitEngagement, observeNetwork, readNetworkState } from '@mabele/core';
import { usePlayerStore } from './player-store';
import { ResilientPlayback } from './resilient-audio';
import { recordStream } from './record-stream';
import { STREAM_COMPLETION_RATIO } from '@/lib/constants';

/**
 * Élément `<audio>` unique de l'application, piloté par le store et protégé par
 * le moteur résilient. Monté une seule fois dans le layout racine : la lecture
 * survit à toute navigation.
 *
 * Ne rend rien de visible. C'est le seul endroit du code qui touche un
 * `HTMLAudioElement` — le reste de l'app ne parle qu'au store.
 */
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<ResilientPlayback | null>(null);
  const streamReportedRef = useRef<string | null>(null);
  const prefetchedForRef = useRef<string | null>(null);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const queue = usePlayerStore((s) => s.queue);
  const current = queue[currentIndex] ?? null;
  const nextTrack = queue[currentIndex + 1] ?? null;

  // Moteur résilient : instancié une fois, rattaché à l'élément audio.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const engine = new ResilientPlayback({
      onHealthChange: (health) => usePlayerStore.getState().setHealth(health),
    });
    engine.attach(audio);
    engineRef.current = engine;

    // Un changement de qualité réseau peut rendre le préchargement pertinent
    // (ou au contraire le proscrire) : on réévalue au prochain cycle.
    const unobserve = observeNetwork(() => {
      prefetchedForRef.current = null;
    });

    return () => {
      unobserve();
      engine.releasePrefetch();
      engine.detach();
      engineRef.current = null;
    };
  }, []);

  // Changement de morceau : nouvelle source, position remise à zéro.
  useEffect(() => {
    const audio = audioRef.current;
    const engine = engineRef.current;
    if (!audio || !engine || !current) return;
    if (audio.src === current.audioUrl) return;

    engine.resetPosition();
    engine.releasePrefetch();
    audio.src = current.audioUrl;
    audio.load();
    streamReportedRef.current = null;
    prefetchedForRef.current = null;
  }, [current]);

  // Intention de lecture. Le moteur se charge de s'acharner en réseau dégradé.
  useEffect(() => {
    const audio = audioRef.current;
    const engine = engineRef.current;
    if (!audio || !engine || !current) return;

    if (isPlaying) {
      engine.play();
    } else {
      engine.stop();
      audio.pause();
    }
  }, [isPlaying, current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  return (
    <audio
      ref={audioRef}
      // `metadata` seulement : sur Edge, un `auto` sur chaque morceau visible
      // saturerait le lien avant même la première lecture.
      preload="metadata"
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        const ms = el.currentTime * 1000;
        usePlayerStore.getState().setPosition(ms);
        if (!current || current.durationMs <= 0) return;

        const ratio = ms / current.durationMs;

        // Précharge le morceau suivant à mi-parcours, sous réserve de la
        // politique data (coupé en 2G et en mode économie).
        if (ratio >= 0.5 && nextTrack && prefetchedForRef.current !== nextTrack.id) {
          const policy = dataPolicyFor(readNetworkState().tier);
          if (engineRef.current?.prefetch(nextTrack.audioUrl, false, policy)) {
            prefetchedForRef.current = nextTrack.id;
          }
        }

        // Comptabilise l'écoute une seule fois, au franchissement du seuil.
        if (streamReportedRef.current !== current.id && ratio >= STREAM_COMPLETION_RATIO) {
          streamReportedRef.current = current.id;
          void recordStream({ trackId: current.id, msPlayed: Math.floor(ms), completed: true });
          emitEngagement('track.completed', current.id);
        }
      }}
      onEnded={() => {
        const track = usePlayerStore.getState().current();
        if (track && streamReportedRef.current !== track.id) {
          streamReportedRef.current = track.id;
          void recordStream({ trackId: track.id, msPlayed: track.durationMs, completed: true });
          emitEngagement('track.completed', track.id);
        }
        usePlayerStore.getState().next();
      }}
    />
  );
}
