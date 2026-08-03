# Décisions de stack (ADR condensé)

> Ce document trace ce qu'on adopte, ce qu'on **reporte** et ce qu'on **refuse**,
> avec la raison. Règle d'arbitrage : la contrainte « ça marche à Bandalungwa
> sous la pluie (2G/Edge, < 2 s, page < 1 Mo) » prime sur toute technologie.

## Adopté

| Choix                                                 | Raison                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| Next.js 15 (App Router, RSC)                          | SSR = meilleur FMP en réseau dégradé ; base déjà testée               |
| Supabase (Postgres + Auth + Storage + RLS + Realtime) | Tout-en-un, RLS default-deny, coût minimal                            |
| PWA + Service Worker                                  | Shell offline, installable sans store                                 |
| i18n maison (dictionnaires lazy)                      | fr/ln/sw/en sans framework lourd (budget < 200 kb)                    |
| Moteur audio résilient                                | Cœur du MVP : lecture continue sur 2G intermittent                    |
| Podcasts                                              | Épisodes courts = alignés 2G ; réutilisent le lecteur et le catalogue |

## Reporté (post-MVP, derrière feature flag, jamais sur le chemin critique)

| Sujet du brief                                           | Pourquoi pas maintenant                                                                                                                                           | Condition de reprise                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Blockchain / NFT (Solidity)**                          | Une opération on-chain = secondes + frais ; hors-sujet pour un auditeur 2G. La souveraineté passe d'abord par les données et le paiement mobile, pas par des NFT. | Demande artiste réelle + wallet grand public en RDC               |
| **IPFS / Arweave**                                       | Récupération lente et non fiable sur 2G. Contredit « < 2 s ».                                                                                                     | CDN edge en Afrique + fallback IPFS uniquement pour l'archivage   |
| **IA lourde côté serveur (TensorFlow/PyTorch, Whisper)** | Coût GPU et latence. La reco v1 SQL suffit au démarrage ; la transcription peut être un job asynchrone.                                                           | Volume de catalogue qui justifie le coût ; Edge Functions dédiées |
| **Adaptive bitrate (HLS/DASH multi-rendition)**          | Exige un pipeline de transcodage. La politique data (`@mabele/core`) fait déjà le choix single-bitrate le plus économe.                                           | Pipeline d'ingestion audio en place                               |
| **Mobile Money / Crypto**                                | Nécessite conformité, contrats PSP, KYC. À traiter comme un lot sérieux, pas un à-côté.                                                                           | Entité légale + intégration PSP (M-Pesa/Orange/Airtel)            |

## Refusé (sauf décision explicite assumée)

| Proposition                       | Raison du refus                                                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Réécriture en Svelte/Preact**   | Détruirait une base Next.js testée (moteur résilient, i18n, MwanaCoins) pour un gain de poids marginal une fois le budget bundle déjà tenu (13 routes < 200 kb). Le coût > le bénéfice. |
| **Kubernetes au démarrage**       | Sur-ingénierie. Vercel + Supabase scalent largement au-delà du MVP sans opérer un cluster.                                                                                              |
| **Backend Python/FastAPI séparé** | Un second runtime à opérer et déployer, sans besoin actuel. Les Edge Functions Supabase couvrent l'IA/webhooks.                                                                         |

## Principe directeur

On n'ajoute une technologie que quand elle **sert la mission mesurable**
(2G/Edge, < 2 s, souveraineté des données), pas parce qu'elle impressionne sur
un slide. « Impressionner 100 ingénieurs » se gagne par la discipline —
budget bundle tenu, RLS partout, tests, dégradation gracieuse — pas par
l'accumulation de buzzwords.
