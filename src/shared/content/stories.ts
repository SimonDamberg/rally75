// Backstory and kusk-note templates. The originals were ported verbatim from the prototype;
// randomness comes from the passed Rng instead of Math.random.
//
// Pool entries must slot grammatically into every template that uses them:
//   YRKEN          follows "en", so common gender only ("en rörmokare")
//   HANDELSER      past tense verb phrase ("förlorade ett vad")
//   BEDRIFTER      supinum, follows "har" ("vunnit tre lopp")
//   OMSTANDIGHETER noun phrase with its own article ("ett strömavbrott")
//   KRAV           a clause after "om" ("banan är blöt")
//   TIDIGARE       bare noun phrase after "var" / "som" ("polishäst")
//   CITAT          goes inside quotation marks, describes the horse
// Keep every rendered line to at most two short sentences: the display iPad clamps the story to
// two lines and the kusk note to one.
import type { Rng } from '../game/rng'
import { fmtInt } from '../game/format'
import { ORTER } from './names'

export const YRKEN = ["tandläkare","kommunekonom","rörmokare","gymnasielärare","bilhandlare","hovslagare","frisör","polis","hemslöjdskonsulent","begravningsentreprenör","IT-konsult","fastighetsmäklare","veterinär","bagare","lantmätare","brandman","undersköterska","busschaufför","revisor","optiker","elektriker","kiropraktor","florist","kock","fiskhandlare","trafiklärare","skorstensfejare","apotekare","lokförare","golvläggare","möbelsnickare","församlingspedagog","alpackauppfödare","auktionsutropare"] as const

export const HANDELSER = ["förlorade ett vad","aldrig fick förklara varför","hade druckit sedan lunch","just blivit lämnad","missförstod annonsen","ville imponera på sin svärmor","trodde det var en ponny","precis vunnit på trisslott","var på fel auktion","inte kunde säga nej","litade på en helt främmande människa","fick ett tips av fel person","råkade lägga högsta budet","inte ville verka feg","hade lovat sin dotter en ponny","blev övertalad på tjugo minuter","hörde fel i telefon","satsade hela bonusen","trodde att det ingick en släpvagn","var kvar när alla andra gått hem","hade precis sagt upp sig","kände sig oövervinnerlig den dagen","blandade ihop två annonser","tolkade det som ett tecken"] as const

export const BEDRIFTER = ["vunnit tre lopp och tappat två skor","aldrig kommit i mål på rätt varv","blivit utvisad från två banor","fått en gata uppkallad efter sig i hemorten","vägrat springa i regn","slagit banrekordet baklänges","varit med i lokaltidningen fyra gånger","levt på rykten","sponsrats av en pizzeria som gått i konkurs","utvecklat en stark motvilja mot publik","kommit tvåa i ett lopp med två hästar","fått en skriftlig varning för sitt uppträdande i stallet","ätit upp en segerkrans","blivit omskriven i en insändare","tappat en sko per lopp i ett halvår","vägrat lämna stallet i fjorton dagar","vunnit ett lopp som senare ströks","blivit stoppad i en tullkontroll","fått en egen grupp på nätet","utvecklat en bestämd åsikt om startbilen","kommit i mål före sin egen kusk","nekats försäkring av två bolag"] as const

export const OMSTANDIGHETER = ["ett strömavbrott","en midsommarfest som spårade ur","kraftig snöyra","en pågående grannfejd","oväntat besök av Skatteverket","ett solförmörkelse-firande","en bandyfinal","total tystnad","en kraftig åskby","en utdragen bouppteckning","ett bröllop som ställdes in","en försenad färja","ett lokalt elprischock","en kommunal ombyggnad","en tvist om en häck","ett hagelskur","en sex timmar lång kommunfullmäktigedebatt","en strejk på pendeltåget"] as const

export const KRAV = ["det spelas musik","någon tittar på","banan är blöt","det är före klockan tolv","publiken klappar för tidigt","en annan häst nyser","det luktar korv","det är fullmåne","någon filmar","det står en hund vid staketet","banan är nykrattad","kusken säger snälla","det är fler än sju åskådare","högtalarna är avstängda","det luktar nybakat","någon har hostat den senaste minuten"] as const

export const TIDIGARE = ["dressyrhäst","polishäst","statist i en reklamfilm","maskot åt ett byggföretag","turistattraktion","fotomodell för ett foderföretag","dragdjur på en julmarknad","ridskolehäst","brudhäst","levande julkalender i ett köpcentrum","modell i en möbelkatalog","hedersgäst på en hembygdsdag","rekvisita i en teateruppsättning","lugnande sällskap åt en annan häst","attraktion på ett ponnyläger","blickfång utanför en bilfirma"] as const

export const CITAT = ["en katastrof som råkar vara snabb","tekniskt sett en häst","min enda vän","oberäknelig men ärlig","bättre än sitt rykte, tyvärr inte mycket","en investering jag helst inte diskuterar","full av potential och lite annat","svår men rättvis","summan av flera dåliga beslut","det bästa vi hade råd med","snabbare än den ser ut","exakt vad vi förtjänar","ett pågående projekt","stabil ända fram till starten","helt lugn tills den inte är det","inte min, juridiskt sett"] as const

/** Purchase price, e.g. "143 000". */
function pris(r: Rng): string {
  return fmtInt(Math.round(r.float(1, 320)) * 1000)
}

export type StoryTemplate = (h: string, k: string, r: Rng) => string

export const STORY_MALLAR: readonly StoryTemplate[] = [
  (h,_k,r)=>`${h} köptes för ${pris(r)} RallyMynt av en ${r.pick(YRKEN)} från ${r.pick(ORTER)} som ${r.pick(HANDELSER)}. Har sedan dess ${r.pick(BEDRIFTER)}.`,
  (_h,_k,r)=>`Föddes i ${r.pick(ORTER)} under ${r.pick(OMSTANDIGHETER)}. Vägrar springa om ${r.pick(KRAV)}.`,
  (_h,k,r)=>`Var ${r.pick(TIDIGARE)} innan olyckan i ${r.pick(ORTER)}. ${k} beskriver hästen som "${r.pick(CITAT)}".`,
  (_h,_k,r)=>`Såldes tre gånger på ett halvår. Nuvarande ägare, en ${r.pick(YRKEN)}, ${r.pick(HANDELSER)} och ångrar sig fortfarande.`,
  (h,_k,r)=>`Tränas numera i en hage utanför ${r.pick(ORTER)} eftersom ${h} ${r.pick(BEDRIFTER)}. Springer bara om ${r.pick(KRAV)}.`,
  (_h,_k,r)=>`Har ett förflutet som ${r.pick(TIDIGARE)}. Kom till travet efter ${r.pick(OMSTANDIGHETER)} och har aldrig riktigt förklarat sig.`,
  (_h,k,r)=>`${k} tog över efter att förra kusken ${r.pick(HANDELSER)}. Hästen kostade ${pris(r)} RallyMynt och har ${r.pick(BEDRIFTER)}.`,
  (_h,_k,r)=>`Beskrivs i stallet som "${r.pick(CITAT)}". Föddes i ${r.pick(ORTER)}, uppfostrades av en ${r.pick(YRKEN)}, litar på ingen.`,
  (_h,_k,r)=>`Kom sist i sitt första lopp och har byggt hela sin karriär på det. Vägrar springa om ${r.pick(KRAV)}.`,
  (h,k,r)=>`Lämnade ${r.pick(ORTER)} efter ${r.pick(OMSTANDIGHETER)}. ${k} hävdar att ${h} är "${r.pick(CITAT)}" och vägrar utveckla.`,
  (h,_k,r)=>`Köptes osedd för ${pris(r)} RallyMynt under ${r.pick(OMSTANDIGHETER)}. Säljaren har inte gått att nå sedan dess, och ${h} vet varför.`,
  (_h,k,r)=>`${k} vann hästen på en fest i ${r.pick(ORTER)}. Ingen av dem vill prata om vilken fest.`,
  (h,_k,r)=>`Uppfödd av en ${r.pick(YRKEN)} som ${r.pick(HANDELSER)}. Det märks fortfarande på ${h}.`,
  (h,_k,r)=>`Har bytt namn tre gånger. Under det förra namnet hade ${h} ${r.pick(BEDRIFTER)}.`,
  ()=>`Tre veterinärer har undersökt hästen och kommit fram till tre olika saker. Den fjärde vägrade uttala sig.`,
  (_h,_k,r)=>`Står uppstallad hos en ${r.pick(YRKEN)} i ${r.pick(ORTER)} som ${r.pick(HANDELSER)}. Hyran är obetald sedan i våras.`,
  (h,k,r)=>`Var ${r.pick(TIDIGARE)} fram till en incident i ${r.pick(ORTER)}. ${k} tog hem ${h} samma kväll och ångrade sig på morgonen.`,
  (_h,_k,r)=>`Försäkringsbolaget har hört av sig två gånger den här månaden. Springer ändå, men bara om ${r.pick(KRAV)}.`,
  (h,_k,r)=>`Vann ett enda lopp, för länge sedan, i ${r.pick(ORTER)}. Sedan dess har ${h} ${r.pick(BEDRIFTER)}.`,
  (_h,k,r)=>`Hela stallet kallar hästen "${r.pick(CITAT)}". ${k} säger att det är ett smeknamn.`,
]

export type KuskNoteTemplate = (k: string, r: Rng) => string

/** Generic notes for random (non-named) kuskar. */
export const KUSK_NOTER: readonly KuskNoteTemplate[] = [
  (k,r)=>`${k} har inte vunnit sedan ${2015+r.int(9)} men talar gärna om det.`,
  k=>`${k} kör i lånad sulky och vill inte prata om varför.`,
  k=>`${k} lovade publiken seger redan i våras.`,
  k=>`${k} vägrar värma upp, vilket syns.`,
  k=>`${k} har bytt stall fyra gånger i år.`,
  k=>`${k} är enligt egen utsago "i sitt livs form".`,
  k=>`${k} kom till banan i taxi och verkar stressad.`,
  k=>`${k} har med sig hela familjen på läktaren. Det brukar sluta illa.`,
  k=>`${k} har med sig fel hjälm och tänker inte erkänna det.`,
  (k,r)=>`${k} körde sitt första lopp ${1998+r.int(20)} och har inte lärt sig något sedan dess.`,
  k=>`${k} har precis avslutat ett samtal som verkar ha gått dåligt.`,
  k=>`${k} vägrar kommentera det som hände i paddocken.`,
  k=>`${k} har vadslagit mot sig själv. Det är tillåtet, tyvärr.`,
  k=>`${k} skyller allt på underlaget, oavsett underlag.`,
  k=>`${k} har lovat att sluta efter det här loppet. Igen.`,
  (k,r)=>`${k} kom hit från ${r.pick(ORTER)} och verkar redan vilja tillbaka.`,
  k=>`${k} tog en genväg genom paddocken och blev tillsagd.`,
  k=>`${k} har en tränare som inte längre svarar i telefon.`,
]
