// Race card flavour: comments, tips, track conditions, silks. Ported verbatim from the prototype.
import type { Silk } from '../game/types'

// Dealt without replacement within a field.
export const KOMMENTARER = ["Går bäst från ledningen.","Hatar innerspår.","Kan vinna om allt stämmer.","Har inte visat något på månader.","Formen pekar uppåt.","Byter skor idag.","Osäker på distansen.","Storfavorit hos publiken, inte hos oss.","Har galopperat i tre raka.","Tränaren är ovanligt tyst.","Ny kusk, nya problem.","Vunnit senast, blev då diskad."] as const

export const TIPS = ["Vår expert: spik.","Vår expert: gardera.","Vår expert: skippa.","Vår expert: chansen i loppet.","Vår expert: har slutat svara i telefon.","Vår expert: blockerad av tränaren.","Vår expert: säkert vinnarval, som förra veckan."] as const

export const BANOR = ["lätt bana, växlande vind","tung bana efter regn","snabb bana, publiken laddad","blöt bana, dålig sikt","hård bana, kylslaget","perfekt bana, misstänkt perfekt"] as const

export const DISTANSER = ["1 640 m autostart","2 140 m voltstart","1 609 m autostart","2 640 m voltstart","1 200 m, kortloppet"] as const

export const SILKS: readonly Silk[] = [
  {bg:"linear-gradient(135deg,#ff2d78,#ffd166)", edge:"#ff2d78"},
  {bg:"linear-gradient(135deg,#39ff9e,#0aa5ff)", edge:"#39ff9e"},
  {bg:"linear-gradient(135deg,#ffd166,#ff7b00)", edge:"#ffd166"},
  {bg:"linear-gradient(135deg,#b388ff,#5e2bff)", edge:"#b388ff"},
  {bg:"linear-gradient(135deg,#fff,#9bb0a4)",    edge:"#ffffff"},
  {bg:"linear-gradient(135deg,#00e5ff,#0066ff)", edge:"#00e5ff"},
  {bg:"linear-gradient(135deg,#ff5252,#7a0000)", edge:"#ff5252"},
  {bg:"linear-gradient(135deg,#c8ff00,#4b8a00)", edge:"#c8ff00"},
]

// What the winning kusk is accused of in a stewards' inquiry.
export const INQUIRY_ACCUSATIONS = ["hindrat en medtävlande","använt piskan på ett sätt som upprör","startat innan startbilen släppt","kört fel varv och haft tur","vägrat lämna in urinprov till huset"] as const
