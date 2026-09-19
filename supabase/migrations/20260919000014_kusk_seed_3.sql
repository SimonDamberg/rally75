-- Seed: the stable is now exactly the eight friends, copied from NAMED_KUSKAR
-- (src/shared/content/kuskar.ts). src/shared/content/kuskSeed.test.ts checks that the newest seed
-- file stays in sync.
--
-- Drops Travpensionären Bengt (the only kusk without a face photo) and re-inserts the eight
-- unchanged. Deleting by name rather than truncating leaves any kusk Simon added by hand in the GM
-- app untouched.

delete from public.kusks
where name in ('Jesper', 'GP', 'Emma', 'Axel', 'Erik', 'Kajsa', 'Simon', 'Palm', 'Travpensionären Bengt');

insert into public.kusks (name, title, notes) values
  ('Jesper', 'banans äldsta', array[
    'Jesper vägrar uppge sin ålder, men banan byggdes efter honom.',
    'Jesper värmer upp i fyrtio minuter och kör i tre.',
    'Jesper har en pensionsförsäkring som hunnit löpa ut två gånger.',
    'Jesper tar en tupplur mellan varven. Det har aldrig kostat honom ett lopp, säger han.',
    'Jesper kallar alla under sextio för "grabben". Det inkluderar hästen.'
  ]),
  ('GP', 'intensiteten själv', array[
    'GP laddade i två veckor och glömde sedan bort vilket lopp det var.',
    'GP har glömt piskan, hjälmen och loppets namn, men inte att vinna.',
    'GP lovade att ta det lugnt idag. Det höll i elva sekunder.',
    'GP kom först till banan i morse och letar fortfarande efter stallet.',
    'GP kör varje lopp som om det vore final. Det är det aldrig.'
  ]),
  ('Emma', 'kör med slutna ögon', array[
    'Emma kör hela loppet med slutna ögon och hävdar att det går fortare så.',
    'Emma har inte sett en målkamera på fyra år.',
    'Emma blinkade 2023 och missade hela upploppet.'
  ]),
  ('Axel', 'gentlemannen', array[
    'Axel anser att omkörningar är ohyfsat och undviker dem när det går.',
    'Axel hälsar på varje medtävlande före start och tappar tre längder på det.',
    'Axel vägrar delta i lopp som avgörs efter klockan nio på kvällen.',
    'Axel har samma piska som sin far och exakt samma åsikter.',
    'Axel bojkottar det nya banunderlaget och kallar det för nymodigheter.',
    'Axel bugar för publiken innan han kommer sist.'
  ]),
  ('Erik', 'avstängd på tre banor', array[
    'Erik har blivit avstängd på tre banor och inbjuden tillbaka till två.',
    'Erik kör stående. Det finns inget regelverk för det.',
    'Erik lovade att ta det försiktigt och skrattade sedan i fyra minuter.',
    'Erik blir lättdistraherad av sand. En gång fastnade han i tre veckor.',
    'Erik kastades ut ur paddocken i morse och är redan tillbaka.'
  ]),
  ('Kajsa', 'hästexpert av annat slag', array[
    'Kajsa avgör en hästs form genom att titta på marken i boxen.',
    'Kajsa höll ett tjugominuters föredrag om hästspillning i paddocken.',
    'Kajsa vägrar satsa på en häst innan hon inspekterat gödselstacken.',
    'Kajsa ringde sin egen telefon för att hitta den. Den låg i hennes ficka.',
    'Kajsa har en väska med allt hon behöver. Hon vet bara aldrig var väskan är.'
  ]),
  ('Simon', 'webbansvarig', array[
    'Simon lovar att oddsen uppdateras i realtid. Det gör de ibland.',
    'Simon kör med en hand och felsöker med den andra.',
    'Simon kom för sent till förra starten efter att ha fastnat i hissen.',
    'Simon har inte sovit sedan sajten gick live.',
    'Simon har en öl i handen och kallar det teknisk support.'
  ]),
  ('Palm', 'ekonomiansvarig', array[
    'Palm har räknat ut exakt vad det här loppet är värt och tänker inte berätta.',
    'Palm vägrar starta innan startpengen ligger på kontot.',
    'Palm äger tre procent av hästen och nittio procent av åsikterna.',
    'Palm har hedgat sig genom att satsa på alla utom sin egen häst.',
    'Palm frågade vad andraplatsen ger. Det var ett dåligt tecken.'
  ]);
