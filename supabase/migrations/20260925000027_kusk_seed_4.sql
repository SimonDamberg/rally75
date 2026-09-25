-- Seed: the stable, copied from NAMED_KUSKAR (src/shared/content/kuskar.ts).
-- src/shared/content/kuskSeed.test.ts checks that the newest seed file stays in sync.
--
-- New notes for every friend, with the boring old ones pruned. Deleting by name rather than
-- truncating leaves any kusk Simon added by hand in the GM app untouched.

delete from public.kusks
where name in ('Jesper', 'GP', 'Emma', 'Axel', 'Erik', 'Kajsa', 'Simon', 'Palm');

insert into public.kusks (name, title, notes) values
  ('Jesper', 'banans äldsta', array[
    'Jesper vägrar uppge sin ålder, men banan byggdes efter honom.',
    'Jesper värmer upp i fyrtio minuter och kör i tre.',
    'Jesper har en pensionsförsäkring som hunnit löpa ut två gånger.',
    'Jesper tar en tupplur mellan varven. Det har aldrig kostat honom ett lopp, säger han.',
    'Jesper kallar alla under sextio för "grabben". Det inkluderar hästen.',
    'Jesper har gett alla hästarna syfilis. Veterinären har slutat fråga hur.',
    'Jesper ropar "droppar slak" i varje kurva. Ingen vet vad det betyder.',
    'Jesper kastade handkontrollen i väggen 2021. Nu kastar han tömmarna.',
    'Jesper skyller varje förlust på lagg.',
    'Jesper skrek "gg ez" efter att ha kommit sist.',
    'Jesper har anmälts för toxiskt beteende av sin egen häst.',
    'Veterinären bokar in hela stallet för provtagning efter varje besök från Jesper.',
    'Jesper låter som en pitbull, luktar som en pitbull och har ungefär samma utseende som Pitbull.'
  ]),
  ('GP', 'intensiteten själv', array[
    'GP laddade i två veckor och glum sedan vilket lopp det var.',
    'GP har glömt piskan, hjälmen och loppets namn, men inte att vinna.',
    'GP lovade att ta det lugnt idag. Det höll i elva sekunder.',
    'GP kom först till banan i morse och letar fortfarande efter stallet.',
    'GP kör varje lopp som om det vore final. Det är det aldrig.',
    'GP svarar "jag glum" på alla frågor, även "vem vann?".',
    'GP har ett enda resultat i karriären: 1x0. Ingen vet varför.',
    'GP har frågat förbundet om hon får köra nästa lopp i omloppsbana.',
    'GP tittar mer upp än fram. Hon letar efter satelliter.',
    'GP har byggt en rymdhjälm av en glasskål. Den är fortfarande kladdig.',
    'GP sa "jag glum" om starten. Och om målet. Och om hästen.',
    'GP har pysslat mer på dräkten än hon har tränat. Det syns.',
    'GP hävdar att hon vunnit om man försummar luftmotståndet.',
    'GP har inte alla hästar hemma. Två av dem står på fel bana.'
  ]),
  ('Emma', 'kör med slutna ögon', array[
    'Emma kör i foliehatt så att startbilen inte kan läsa hennes tankar.',
    'Emma tror att målkameran jobbar för deep state.',
    'Emma kärnar sitt eget smör och syr sin egen dräkt. Hästen är det enda moderna hon godkänt.',
    'Emma har så tjocka glasögon att hon såg målgången innan starten gick.',
    'Emma vägrar skanna QR-koder. Det är så de chippar en.',
    'Emma kallar startbilen för "deras bil" och vägrar säga vilka "de" är.',
    'Emma läser startlistan på tre centimeters avstånd.',
    'Emma har förberett sig för allt utom själva loppet.',
    'Emma vägrar ligga bakom andra hästar. Hon är rädd för deras chemtrails.',
    'Emma dejtar bara män som minns när travet var på riktigt.',
    'Emma kallar sin dejt för "en man med erfarenhet". Han var med när Solvalla byggdes.'
  ]),
  ('Axel', 'gentlemannen', array[
    'Axel anser att omkörningar är ohyfsat och undviker dem när det går.',
    'Axel hälsar på varje medtävlande före start och tappar tre längder på det.',
    'Axel vägrar delta i lopp som avgörs efter klockan nio på kvällen.',
    'Axel har samma piska som sin far och exakt samma åsikter.',
    'Axel bojkottar det nya banunderlaget och kallar det för nymodigheter.',
    'Axel bugar för publiken innan han kommer sist.',
    'Axel anmälde en omkörning som "oerhört ohyfsad". Det var han själv som körde om.',
    'Axel tycker att det enda som blivit bättre sedan 1918 är hans egen hållning.'
  ]),
  ('Erik', 'avstängd på tre banor', array[
    'Erik har blivit avstängd på tre banor och inbjuden tillbaka till två.',
    'Erik kör stående. Det finns inget regelverk för det.',
    'Erik blir lättdistraherad av sand. En gång fastnade han i tre veckor.',
    'Erik köpte hästen med sin oskuld som pant. Den har aldrig lösts ut, och ingen har budat.',
    'Erik kommer direkt från pappersbruket. Lukten gör att hästen springer utan honom.',
    'Pantbanken värderade Eriks oskuld till en hel häst. Det är den mest optimistiska värderingen i Sveriges historia.',
    'Erik kallar lukten "arbetarklass". Hästen kallar den något annat.',
    'Erik jobbar med papper men har aldrig läst ett regelverk.',
    'Erik gör "vad som helst" för ett tidsavdrag. Domaren har bett honom sluta erbjuda.'
  ]),
  ('Kajsa', 'hästexpert av annat slag', array[
    'Kajsa vägrar satsa på en häst innan hon inspekterat gödselstacken.',
    'Kajsa ringde sin egen telefon för att hitta den. Den låg i hennes ficka.',
    'Kajsa har en väska med allt hon behöver. Hon vet bara aldrig var väskan är.',
    'Kajsa är inne på sitt sjunde rally. Arrangörerna har slutat skicka inbjudan, hon kommer ändå.',
    'Kajsa har kört sju rallyn och aldrig vunnit. Hon vill inte prata om det.',
    'Kajsa tappade skorna på första rallyt och värdigheten på det tredje.',
    'Kajsa kallar det tradition. Alla andra kallar det ett problem.',
    'Kajsa har fler rallymärken än vänner som vill åka med henne.',
    'Kajsas fötter luktar häst. Hästen tar illa upp.',
    'Kajsa vill göra det tydligt att hon inte är en hästtjej. Hon sa det medan hon flätade manen.',
    'Kajsa är inte en hästtjej. Hon har bara sju rallyn, en sadel och hästens födelsedag i kalendern.',
    'Kajsa har bett speakern presentera henne som "inte en hästtjej".'
  ]),
  ('Simon', 'webbansvarig', array[
    'Simon lovar att oddsen uppdateras i realtid. Det gör de ibland.',
    'Simon piskar med en hand och felsöker med den andra.',
    'Simon kom för sent till förra starten efter att ha fastnat i hissen.',
    'Simon har en öl i handen och kallar det teknisk support.',
    'Simon byggde sajten, sätter oddsen och kör själv. Han ser ingen jävssituation.',
    'Simon tror att galopp är en suröl och har beställt två.',
    'Simon tappar hästen efter varje lopp. Det är så man gör i Magic, säger han.',
    'Simon har gett sig själv bäst odds på sajten. Det är en slump, säger koden.',
    'Simon tror att tempo är en IPA och att upplopp är en lambic.',
    'Simon kallar varje öl ett "produkttest". Testet pågår.',
    'Simon har fler Magic-kort än vänner, och korten är mer värda.'
  ]),
  ('Palm', 'ekonomiansvarig', array[
    'Palm vägrar starta innan startpengen ligger på kontot.',
    'Palm har hedgat sig genom att satsa på alla utom sin egen häst.',
    'Palm frågade vad andraplatsen ger. Det var ett dåligt tecken.',
    'Palm har stämt tre medtävlande för förtal. Två av dem hade bara hälsat.',
    'Palm kallar varje dåligt odds för förtal.',
    'Palm bokade 3 hästar och fick en. Hans advokat är kontaktad.',
    'Palm fick sin licens genom en bekant på departementet. Han kallar det nätverkande.',
    'Palm hotade startbilen med förtal. Den svarade inte, vilket han tar som ett erkännande.',
    'Palm har aldrig förlorat ett lopp. Han har blivit förtalad av resultatlistan.',
    'Palm kallar lobbying för "att umgås" och mutor för "att bjuda".',
    'Palm har en kontakt på Rosenbad som alltid svarar. Det är hans mamma.'
  ]);
