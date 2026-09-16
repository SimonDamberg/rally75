// The stable's kuskar. Keep the shape: one running joke and a handful of notes each, so a
// character is legible after two sightings. They are Simon's friends, so the notes stay absurd and
// affectionate, never an accusation about a real person.
//
// The newest seed migration is the source of truth for this roster, not the other way round: at
// runtime the GM edits kuskar in the DB, and this file is what the app reads before they load.
// Edit the seed file, then bring this one in line; kuskSeed.test.ts fails while the two disagree.
import type { KuskInput } from "../game/types";

export const NAMED_KUSKAR: readonly KuskInput[] = [
  {
    name: "Jesper",
    title: "banans äldsta",
    notes: [
      "Jesper vägrar uppge sin ålder, men banan byggdes efter honom.",
      "Jesper värmer upp i fyrtio minuter och kör i tre.",
      "Jesper har en pensionsförsäkring som hunnit löpa ut två gånger.",
      "Jesper tar en tupplur mellan varven. Det har aldrig kostat honom ett lopp, säger han.",
      'Jesper kallar alla under sextio för "grabben". Det inkluderar hästen.',
    ],
  },
  {
    name: "GP",
    title: "intensiteten själv",
    notes: [
      "GP laddade i två veckor och glömde sedan bort vilket lopp det var.",
      "GP har glömt piskan, hjälmen och loppets namn, men inte att vinna.",
      "GP lovade att ta det lugnt idag. Det höll i elva sekunder.",
      "GP kom först till banan i morse och letar fortfarande efter stallet.",
      "GP kör varje lopp som om det vore final. Det är det aldrig.",
    ],
  },
  {
    name: "Emma",
    title: "kör med slutna ögon",
    notes: [
      "Emma kör hela loppet med slutna ögon och hävdar att det går fortare så.",
      "Emma har inte sett en målkamera på fyra år.",
      "Emma blinkade 2023 och missade hela upploppet.",
    ],
  },
  {
    name: "Axel",
    title: "gentlemannen",
    notes: [
      "Axel anser att omkörningar är ohyfsat och undviker dem när det går.",
      "Axel hälsar på varje medtävlande före start och tappar tre längder på det.",
      "Axel vägrar delta i lopp som avgörs efter klockan nio på kvällen.",
      "Axel har samma piska som sin far och exakt samma åsikter.",
      "Axel bojkottar det nya banunderlaget och kallar det för nymodigheter.",
      "Axel bugar för publiken innan han kommer sist.",
    ],
  },
  {
    name: "Erik",
    title: "avstängd på tre banor",
    notes: [
      "Erik har blivit avstängd på tre banor och inbjuden tillbaka till två.",
      "Erik kör stående. Det finns inget regelverk för det.",
      "Erik lovade att ta det försiktigt och skrattade sedan i fyra minuter.",
      "Erik blir lättdistraherad av sand. En gång fastnade han i tre veckor.",
      "Erik kastades ut ur paddocken i morse och är redan tillbaka.",
    ],
  },
  {
    name: "Kajsa",
    title: "hästexpert av annat slag",
    notes: [
      "Kajsa avgör en hästs form genom att titta på marken i boxen.",
      "Kajsa höll ett tjugominuters föredrag om hästspillning i paddocken.",
      "Kajsa vägrar satsa på en häst innan hon inspekterat gödselstacken.",
      "Kajsa ringde sin egen telefon för att hitta den. Den låg i hennes ficka.",
      "Kajsa har en väska med allt hon behöver. Hon vet bara aldrig var väskan är.",
    ],
  },
  {
    name: "Simon",
    title: "webbansvarig",
    notes: [
      "Simon lovar att oddsen uppdateras i realtid. Det gör de ibland.",
      "Simon kör med en hand och felsöker med den andra.",
      "Simon kom för sent till förra starten efter att ha fastnat i hissen.",
      "Simon har inte sovit sedan sajten gick live.",
      "Simon har en öl i handen och kallar det teknisk support.",
    ],
  },
  {
    name: "Palm",
    title: "ekonomiansvarig",
    notes: [
      "Palm har räknat ut exakt vad det här loppet är värt och tänker inte berätta.",
      "Palm vägrar starta innan startpengen ligger på kontot.",
      "Palm äger tre procent av hästen och nittio procent av åsikterna.",
      "Palm har hedgat sig genom att satsa på alla utom sin egen häst.",
      "Palm frågade vad andraplatsen ger. Det var ett dåligt tecken.",
    ],
  },
  {
    name: "Travpensionären Bengt",
    title: "nästa vecka tar han igen det",
    notes: [
      "Bengt har spelat på det här loppet sedan innan han själv kom med i det.",
      "Bengt kör med kupongen i munnen och termosen mellan knäna.",
      "Bengt har ett system. Bengt har haft samma system i trettio år.",
      "Bengt säger att han var nära förra veckan. Det var han inte.",
      "Bengt tar igen allt nästa vecka. Det har han sagt varje vecka.",
    ],
  },
];
