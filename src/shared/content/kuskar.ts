// The stable's kuskar. Seed data for the `kusks` table (Stage 2); at runtime the GM edits them
// in the DB. Keep the shape: one running joke, seven notes each, so a character is legible after
// two sightings.
//
// NAMED_KUSKAR are Simon's friends and every field gets at least one of them. GAST_KUSKAR are
// cameos: the laugh is that they showed up at all, so their notes stay absurd and affectionate,
// never an accusation about a real person.
import type { KuskInput } from "../game/types";

export const NAMED_KUSKAR: readonly KuskInput[] = [
  {
    name: "Jesper",
    title: "banans äldsta",
    notes: [
      "Jesper vägrar uppge sin ålder, men banan byggdes efter honom.",
      "Jesper minns när sulkyn hade trähjul. Han var vuxen då.",
      "Jesper värmer upp i fyrtio minuter och kör i tre.",
      "Jespers rekord sattes under en regering ingen minns namnet på.",
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
      "GP skriker instruktioner till en häst som inte är med i det här loppet.",
      "GP har glömt piskan, hjälmen och loppets namn, men inte att vinna.",
      "GP lovade att ta det lugnt idag. Det höll i elva sekunder.",
      "GP hade en plan. GP har tappat bort planen.",
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
      "Emma känner sig fram längs innerstaketet. Det har fungerat förvånansvärt ofta.",
      "Emma öppnade ögonen i sista kurvan en gång och blev omkörd av ren chock.",
      "Emma har aldrig sett sin egen häst. Hon känner igen den på ljudet.",
      "Emma blinkade 2021 och missade hela upploppet.",
      "Emma säger att hon ser bättre så här. Ingen vågar fråga vidare.",
    ],
  },
  {
    name: "Axel",
    title: "gentlemannen",
    notes: [
      "Axel kör i kostym och vägrar erkänna att sulkyn är av plast.",
      "Axel anser att omkörningar är ohyfsat och undviker dem när det går.",
      "Axel hälsar på varje medtävlande före start och tappar tre längder på det.",
      "Axel vägrar delta i lopp som avgörs efter klockan nio på kvällen.",
      "Axel har samma piska som sin far och exakt samma åsikter.",
      "Axel tycker att det nya banunderlaget är en modefluga.",
      "Axel bugar för publiken innan han kommer sist.",
    ],
  },
  {
    name: "Erik",
    title: "avstängd på tre banor",
    notes: [
      "Erik har blivit avstängd på tre banor och inbjuden tillbaka till två.",
      "Erik startade förra loppet före startbilen och vann ändå inte.",
      "Erik kör stående. Det finns inget regelverk för det.",
      "Erik lovade att ta det försiktigt och skrattade sedan i fyra minuter.",
      "Erik tog innerspåret genom en häck en gång. Han pratar gärna om det.",
      "Erik har ingen plan och är stolt över det.",
      "Erik kastades ut ur paddocken i morse och är redan tillbaka.",
    ],
  },
  {
    name: "Kajsa",
    title: "hästexpert av annat slag",
    notes: [
      "Kajsa avgör en hästs form genom att titta i boxen. Bara genom att titta i boxen.",
      "Kajsa höll ett tjugominuters föredrag om hästspillning i paddocken. Ingen kom undan.",
      "Kajsa vägrar satsa på en häst innan hon inspekterat gödselstacken.",
      "Kajsa har fotograferat allt hon hittat på banan idag. Vi visar inte bilderna.",
      "Kajsa säger att den här hästen har ätit något den inte borde. Hon har alltid rätt.",
      "Kajsa luktade på banan före start och såg bekymrad ut.",
      "Kajsa är faktiskt publicerad i ämnet. Det gör det inte mindre obehagligt.",
    ],
  },
  {
    name: "Simon",
    title: "webbansvarig",
    notes: [
      "Simon kör med laptop i knät och håller hemsidan uppe under loppet.",
      "Simon startade om servern i sista kurvan och tappade ledningen.",
      "Simon lovar att oddsen uppdateras i realtid. Det gör de ibland.",
      "Simon kör med en hand och felsöker med den andra.",
      "Simon säger att det inte är hans fel utan cachen.",
      "Simon deployade en fix mitt under loppet. Något annat gick sönder.",
      "Simon har inte sovit sedan sajten gick live. Det syns.",
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
      "Palm tog betalt för att över huvud taget vara med i det här loppet.",
      "Palm förhandlade fram en bonus per längd. Det märks på körningen.",
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
      "Bengt känner igen alla hästar och ingen av kuskarna.",
      "Bengt tar igen allt nästa vecka. Det har han sagt varje vecka.",
      "Bengt kom hit klockan sju i morse. Loppet börjar i kväll.",
    ],
  },
];
