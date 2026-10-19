/*
 * Iris verification ledger for the 63-title catalog.
 *
 * The original Cool Kids Animation Filmography is retained only as a candidate
 * seed in researchCatalog.js. Active catalog source fields are taken from this
 * ledger; premise, audience, age, content, and visual-style fields remain
 * unverified unless separately curated.
 */

const v = (status, canonicalTitle, year, directors, studioOrProducer, sourceUrls, unverifiedFields = [], note = '') => ({
  status,
  canonicalTitle,
  year,
  directors,
  studioOrProducer,
  sourceUrls,
  unverifiedFields,
  note,
});

export const catalogVerification = {
  'pinocchio': v('VERIFIED', 'Pinocchio', 1940, ['Ben Sharpsteen', 'Hamilton Luske'], null, ['https://www.bfi.org.uk/film/9589e814-4b73-5689-984a-36ded87eeee8/pinocchio'], ['studio_or_producer']),
  'fantasia': v('CORRECTED', 'Fantasia', 1940, ['Ben Sharpsteen', 'Samuel Armstrong', 'James Algar', 'Bill Roberts', 'Paul Satterfield', 'Hamilton Luske', 'Jim Handley', 'Ford Beebe', 'T. Hee', 'Norman Ferguson', 'Wilfred Jackson'], 'Walt Disney', ['https://www.bfi.org.uk/film/283b7796-aac5-5b3a-8396-a50cf4f05707/fantasia']),
  'sleeping-beauty': v('CORRECTED', 'Sleeping Beauty', 1959, ['Les Clark', 'Clyde Geronimi', 'Eric Larson', 'Wolfgang Reitherman', 'Hamilton Luske'], 'Walt Disney Productions', ['https://www.imdb.com/title/tt0053285/', 'https://simple.wikipedia.org/wiki/Sleeping_Beauty_(1959_movie)']),
  'beauty-and-the-beast': v('VERIFIED', 'Beauty and the Beast', 1991, ['Gary Trousdale', 'Kirk Wise'], null, ['https://bfidatadigipres.github.io/making%20magic%3Cbr%3E100%20years%20of%20disney/2023/07/22/beauty-and-the-beast/', 'https://en.wikipedia.org/wiki/Beauty_and_the_Beast_(1991_film)'], ['studio_or_producer']),
  'the-lion-king': v('VERIFIED', 'The Lion King', 1994, ['Roger Allers', 'Rob Minkoff'], null, ['https://www.imdb.com/title/tt0110357/', 'https://www.bfi.org.uk/film/c54e3460-ff15-5b93-896b-751e0f48c17d/the-lion-king'], ['studio_or_producer']),
  'iron-giant': v('VERIFIED', 'The Iron Giant', 1999, ['Brad Bird'], null, ['https://www.imdb.com/title/tt0129167/', 'https://en.wikipedia.org/wiki/The_Iron_Giant'], ['studio_or_producer']),
  'lilo-and-stitch': v('VERIFIED', 'Lilo & Stitch', 2002, ['Chris Sanders', 'Dean DeBlois'], null, ['https://www.wikidata.org/wiki/Q36092', 'https://en.wikipedia.org/wiki/Lilo_%26_Stitch'], ['studio_or_producer']),
  'treasure-planet': v('VERIFIED', 'Treasure Planet', 2002, ['John Musker', 'Ron Clements'], 'Walt Disney Pictures', ['https://en.wikipedia.org/wiki/Treasure_Planet', 'https://www.imdb.com/title/tt0133240/']),

  'wall-e': v('VERIFIED', 'WALL-E', 2008, ['Andrew Stanton'], null, ['https://movies.disney.com/wall-e', 'https://www.wikidata.org/wiki/Q104905'], ['studio_or_producer']),
  'up': v('VERIFIED', 'Up', 2009, ['Pete Docter', 'Bob Peterson'], null, ['https://movies.disney.com/up', 'https://www.wikidata.org/wiki/Q174811'], ['studio_or_producer']),
  'inside-out': v('FLAGGED', 'Inside Out', 2015, ['Pete Docter'], null, ['https://movies.disney.com/inside-out', 'https://www.bfi.org.uk/sight-and-sound/reviews/inside-out-first-look', 'https://www.wikidata.org/wiki/Q6144664'], ['Ronnie del Carmen', 'studio_or_producer'], 'The returned sources established Pete Docter but not the complete local director list or studio.'),
  'zootopia': v('FLAGGED', 'Zootopia', 2016, ['Byron Howard'], null, ['https://www.wikidata.org/wiki/Q15270647'], ['Rich Moore', 'studio_or_producer'], 'The returned source established Byron Howard but not the complete local director list or studio.'),
  'moana': v('VERIFIED', 'Moana', 2016, ['John Musker', 'Ron Clements'], null, ['https://www.wikidata.org/wiki/Q18647981'], ['studio_or_producer']),
  'encanto': v('VERIFIED', 'Encanto', 2021, ['Jared Bush', 'Byron Howard'], null, ['https://movies.disney.com/encanto', 'https://news.disney.com/encanto-directors-interview'], ['studio_or_producer']),
  'nausicaa-of-the-valley-of-the-wind': v('VERIFIED', 'Nausicaä of the Valley of the Wind', 1984, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://www.ghibli.jp/works/nausicaa/', 'https://www.siff.net/programs-and-events/art-of-studio-ghibli/nausicaa-of-the-valley-of-the-wind']),
  'castle-in-the-sky': v('VERIFIED', 'Castle in the Sky', 1986, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://www.ghibli.jp/works/laputa/', 'https://gkids.com/films/castle-in-the-sky/']),

  'totoro': v('VERIFIED', 'My Neighbor Totoro', 1988, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://www.bfi.org.uk/film/659f87a6-000d-59a5-b3ab-536f10de2c39/my-neighbour-totoro', 'https://gkids.com/films/my-neighbor-totoro/']),
  'kikis-delivery-service': v('VERIFIED', "Kiki's Delivery Service", 1989, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://en.wikipedia.org/wiki/Kiki%27s_Delivery_Service', 'https://gkids.com/films/kikis-delivery-service/', 'https://academymuseumstore.org/products/studio-ghibli-kikis-delivery-service-exclusive-poster']),
  'porco-rosso': v('VERIFIED', 'Porco Rosso', 1992, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://en.wikipedia.org/wiki/Porco_Rosso', 'https://gkids.com/films/porco-rosso/']),
  'princess-mononoke': v('VERIFIED', 'Princess Mononoke', 1997, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://bfidatadigipres.github.io/bfi%20families/2022/05/02/princess-mononoke/', 'https://gkids.com/2025/03/11/new-princess-mononoke-4k-restorationto-debut-exclusively-in-imax-theatres-in-north-america-march-26/', 'https://en.wikipedia.org/wiki/Princess_Mononoke']),
  'spirited-away': v('VERIFIED', 'Spirited Away', 2001, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://www.bfi.org.uk/film/f25b5afd-4b55-598b-8bed-f284de120f94/spirited-away', 'https://en.wikipedia.org/wiki/Spirited_Away']),
  'howls-moving-castle': v('VERIFIED', "Howl's Moving Castle", 2004, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://academymuseumstore.org/products/howls-moving-castle-print', 'https://gkids.com/films/howls-moving-castle/']),
  'ponyo': v('VERIFIED', 'Ponyo', 2008, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://www.academymuseum.org/exhibitions/studio-ghiblis-ponyo', 'https://en.wikipedia.org/wiki/Ponyo', 'https://gkids.com/films/ponyo/']),
  'the-secret-world-of-arrietty': v('FLAGGED', 'The Secret World of Arrietty', 2010, ['Hiromasa Yonebayashi'], null, ['https://gkids.com/films/the-secret-world-of-arrietty/', 'https://www.ghibli.jp/history/', 'https://www.imdb.com/title/tt1568921/'], ['studio_or_producer'], 'The returned sources established the film and director but did not explicitly establish the Studio Ghibli field.'),
  'the-tale-of-the-princess-kaguya': v('VERIFIED', 'The Tale of the Princess Kaguya', 2013, ['Isao Takahata'], 'Studio Ghibli', ['https://gkids.com/films/the-tale-of-the-princess-kaguya/', 'https://bfidatadigipres.github.io/anime/2022/05/03/tale-of-the-princess-kaguya/', 'https://en.wikipedia.org/wiki/The_Tale_of_the_Princess_Kaguya_(film)']),
  'the-boy-and-the-heron': v('VERIFIED', 'The Boy and the Heron', 2023, ['Hayao Miyazaki'], 'Studio Ghibli', ['https://en.wikipedia.org/wiki/The_Boy_and_the_Heron', 'https://gkids.com/films/the-boy-and-the-heron/', 'https://variety.com/2023/film/trailers/boy-and-the-heron-trailer-studio-ghibli-hayao-miyazaki-1235711276/']),

  'the-nightmare-before-christmas': v('CORRECTED', 'The Nightmare Before Christmas', 1993, ['Henry Selick'], 'Touchstone Pictures; Burton/DiNovi production company', ['https://bfidatadigipres.github.io/big%20screen%20classics/2021/12/07/nightmare-before-christmas/', 'https://www.nytimes.com/2023/10/25/movies/the-nightmare-before-christmas-tim-burton-henry-selick.html', 'https://en.wikipedia.org/wiki/The_Nightmare_Before_Christmas']),
  'chicken-run': v('CORRECTED', 'Chicken Run', 2000, ['Peter Lord', 'Nick Park'], 'Aardman Animations with DreamWorks Animation and Pathé', ['https://www.aardman.com/film-tv-games/chicken-run/', 'https://player.bfi.org.uk/rentals/film/watch-chicken-run-2000-online', 'https://www.moma.org/calendar/events/1864']),
  'corpse-bride': v('VERIFIED', 'Corpse Bride', 2005, ['Tim Burton', 'Mike Johnson'], 'Tim Burton Productions', ['https://www.wikidata.org/wiki/Q164417', 'https://www.bfi.org.uk/film/3f8c53af-7083-5680-ae5e-dfa94c008e8a/tim-burtons-corpse-bride', 'https://letterboxd.com/film/corpse-bride/']),
  'wallace-and-gromit-the-curse-of-the-were-rabbit': v('VERIFIED', 'Wallace & Gromit: The Curse of the Were-Rabbit', 2005, ['Nick Park', 'Steve Box'], 'Aardman Animations', ['https://www.aardman.com/film-tv-games/the-curse-of-the-were-rabbit/', 'https://www.bfi.org.uk/resources-events-teachers/resources-teachers/gothic-classroom/film-13-wallace-gromit-curse-were-rabbit-2005', 'https://en.wikipedia.org/wiki/Wallace_%26_Gromit:_The_Curse_of_the_Were-Rabbit']),
  'coraline': v('VERIFIED', 'Coraline', 2009, ['Henry Selick'], 'Laika Studios', ['https://www.bfi.org.uk/news/stop-motion-animation-season-supported-laika-coming-bfi-southbank', 'https://www.indiewire.com/features/animation/coraline-director-henry-selick-15th-anniversary-laika-interview-1235035653/']),
  'fantastic-mr-fox': v('VERIFIED', 'Fantastic Mr. Fox', 2009, ['Wes Anderson'], 'Indian Paintbrush / Regency Enterprises', ['https://www.bfi.org.uk/film/063f45ea-bb5a-552f-ac97-ae7870d5165a/fantastic-mr-fox', 'https://variety.com/2009/film/markets-festivals/fantastic-mr-fox-3-1200476864/', 'https://letterboxd.com/film/fantastic-mr-fox/']),
  'paranorman': v('VERIFIED', 'ParaNorman', 2012, ['Sam Fell', 'Chris Butler'], 'Laika Studios', ['https://en.wikipedia.org/wiki/ParaNorman', 'https://en.wikipedia.org/wiki/Laika,_LLC']),
  'the-boxtrolls': v('VERIFIED', 'The Boxtrolls', 2014, ['Graham Annable', 'Anthony Stacchi'], 'Laika Studios', ['https://blog.academyart.edu/meet-the-boxtrolls-co-directors-graham-annable-anthony-stacchi/', 'https://letterboxd.com/film/the-boxtrolls/', 'https://laikafilms.fandom.com/wiki/The_Boxtrolls']),
  'shaun-the-sheep-movie': v('VERIFIED', 'Shaun the Sheep Movie', 2015, ['Mark Burton', 'Richard Starzak'], 'Aardman Animations', ['https://www.aardman.com/film-tv-games/shaun-the-sheep-movies/', 'https://player.bfi.org.uk/rentals/film/watch-shaun-the-sheep-movie-2015-online', 'https://www.imdb.com/title/tt2872750/']),
  'my-life-as-a-zucchini': v('CORRECTED', 'My Life as a Zucchini', 2016, ['Claude Barras'], 'Blue Spirit Productions, Gebeka Films, Rita Productions, KNM', ['https://www.spirit-prod.com/en/project/ma-vie-de-courgette/', 'https://letterboxd.com/film/my-life-as-a-zucchini/', 'https://www.cartoonbrew.com/awards/life-zucchini-wins-best-animated-feature-european-film-awards-146183.html']),
  'kubo-and-the-two-strings': v('VERIFIED', 'Kubo and the Two Strings', 2016, ['Travis Knight'], 'Laika Studios', ['https://whatson.bfi.org.uk/Online/default.asp?BOparam::WScontent::loadArticle::permalink=kubo-and-the-two-strings-qand-a', 'https://en.wikipedia.org/wiki/Kubo_and_the_Two_Strings']),
  'guillermo-del-toros-pinocchio': v('FLAGGED', "Guillermo del Toro's Pinocchio", 2022, ['Guillermo del Toro', 'Mark Gustafson'], 'Netflix', ['https://about.netflix.com/en/news/guillermo-del-toros-official-teaser-trailer-and-key-art-debut', 'https://www.netflix.com/title/80218455', 'https://www.netflix.com/tudum/articles/pinocchio-stop-motion-behind-the-scenes'], ['ShadowMachine producer credit'], 'Netflix and the directors were established; ShadowMachine was not established by the returned snippets.'),
  'wallace-and-gromit-vengeance-most-fowl': v('FLAGGED', 'Wallace & Gromit: Vengeance Most Fowl', 2024, ['Nick Park', 'Merlin Crossingham'], null, ['https://www.wallaceandgromit.com/films/vengeance-most-fowl/', 'https://en.wikipedia.org/wiki/Wallace_%26_Gromit:_Vengeance_Most_Fowl'], ['studio_or_producer'], 'The official result established title and directors but not the Aardman producer credit.'),
  'wildwood': v('VERIFIED', 'Wildwood', 2026, ['Travis Knight'], 'Laika Studios', ['https://variety.com/2026/film/global/wildwood-director-animation-16-year-journey-london-premiere-1236908166/']),

  'the-triplets-of-belleville-les-triplettes-de-belleville': v('FLAGGED', 'The Triplets of Belleville', 2003, ['Sylvain Chomet'], 'Les Armateurs', ['https://en.wikipedia.org/wiki/The_Triplets_of_Belleville', 'https://www.imdb.com/title/tt0286244/', 'https://www.amazon.com/Triplets-Belleville-Sylvain-Chomet-Paul-Cadieux/dp/B0001IN0MQ'], ['Champion co-producer', 'French alternate title']),
  'dragon-hunters-chasseurs-de-dragons': v('FLAGGED', 'Dragon Hunters', 2008, ['Guillaume Ivernel', 'Arthur Qwak'], null, ['https://en.wikipedia.org/wiki/Dragon_Hunters_(film)', 'https://m.imdb.com/title/tt00944834/', 'https://www.wikidata.org/wiki/Q1254870'], ['studio_or_producer', 'film Wikidata identity'], 'The Wikidata result was a Dragon Hunters series entity; release/entity status remains flagged.'),
  'the-secret-of-kells': v('VERIFIED', 'The Secret of Kells', 2009, ['Tomm Moore', 'Nora Twomey'], 'Cartoon Saloon', ['https://www.cartoonsaloon.ie/the-secret-of-kells/', 'https://www.oscars.org/oscars/ceremonies/2010']),
  'the-illusionist-lillusionniste': v('FLAGGED', 'The Illusionist', 2010, ['Sylvain Chomet'], null, ['https://www.bfi.org.uk/film/39e89c62-84ff-5484-a024-2a347ee8b954/the-illusionist', 'https://www2.bfi.org.uk/films-tv-people/4ce2b8b723f25', 'http://old.bfi.org.uk/sightandsound/review/5598'], ['studio_or_producer', 'French alternate title'], 'BFI supported the film, year, director, and producers; Django Films/Pathé was not established.'),
  'a-cat-in-paris-une-vie-de-chat': v('FLAGGED', 'A Cat in Paris', 2010, ['Jean-Loup Felicioli', 'Alain Gagnol'], null, ['https://www.berlinale.de/en/2011/programme/20112185.html', 'https://www.youtube.com/watch?v=2h0iM32VLK8'], ['studio_or_producer']),
  'the-painting-le-tableau': v('FLAGGED', 'The Painting', 2011, ['Jean-François Laguionie'], null, ['https://www.wikidata.org/wiki/Q617969', 'https://www.mfa.org/event/film/the-painting-le-tableau'], ['studio_or_producer']),
  'ernest-celestine': v('FLAGGED', 'Ernest & Celestine', 2012, ['Benjamin Renner', 'Stéphane Aubier', 'Vincent Patar'], null, ['https://www.imdb.com/title/tt1816518/', 'https://en.wikipedia.org/wiki/Ernest_%26_Celestine'], ['studio_or_producer', 'French alternate title']),

  'jack-and-the-cuckoo-clock-heart': v('FLAGGED', 'Jack and the Cuckoo-Clock Heart', null, ['Mathias Malzieu', 'Stéphane Berla'], null, ['https://www.europeanfilmawards.eu/efa-movie/jack-and-the-cuckoo-clock-heart/', 'https://www.europeanfilmawards.eu/award-edition/awards-2014/'], ['year', 'studio_or_producer'], 'Title and directors were established; the permitted results did not establish the year or studio/producer.'),
  'song-of-the-sea': v('CORRECTED', 'Song of the Sea', 2014, ['Tomm Moore'], ['Cartoon Saloon', 'Melusine Productions', 'The Big Farm', 'Nørlum', 'Superprod'], ['https://www.cartoonsaloon.ie/song-of-the-sea/', 'https://bfidatadigipres.github.io/cartoon%20saloon%20at%2025/2024/01/13/song-of-the-sea/']),
  'the-big-bad-fox-and-other-tales': v('CORRECTED', 'The Big Bad Fox and Other Tales', 2017, ['Benjamin Renner', 'Patrick Imbert'], ['Folivari', 'Panique!'], ['https://en.wikipedia.org/wiki/The_Big_Bad_Fox_and_Other_Tales']),
  'the-breadwinner': v('CORRECTED', 'The Breadwinner', 2017, ['Nora Twomey'], ['Aircraft Pictures', 'Melusine Productions', 'Cartoon Saloon'], ['https://www.cartoonsaloon.ie/irish-animation-studio/feature-films/the-breadwinner/', 'https://www.cartoonsaloon.ie/irish-animation-studio/about/']),
  'wolfwalkers': v('CORRECTED', 'Wolfwalkers', 2020, ['Tomm Moore', 'Ross Stewart'], 'Cartoon Saloon', ['https://www.cartoonsaloon.ie/irish-animation-studio/about/', 'https://www.cartoonsaloon.ie/irish-animation-studio/feature-films/wolfwalkers/'], ['full_co_production_companies']),
  'chicken-for-linda-linda-veut-du-poulet': v('CORRECTED', 'Chicken for Linda!', 2022, ['Chiara Malta', 'Sébastien Laudenbach'], ['Dolce Vita Films', 'Miyu Productions'], ['https://en.unifrance.org/movie/54987/chicken-for-linda', 'https://gkids.com/2023/06/15/gkids-acquires-north-american-rights-to-chicken-for-linda/'], ['release_year'], 'The source establishes production year 2022 and a 2023 French release; the catalog uses production year.'),
  'robot-dreams': v('CORRECTED', 'Robot Dreams', 2023, ['Pablo Berger'], ['Arcadia Motion Pictures', 'Lokiz Films', 'Noodles Production', 'Les Films du Worso'], ['https://www.festival-cannes.com/en/f/robot-dreams/', 'https://www.arcadiamotionpictures.com/en/about-us/', 'https://www.arcadiamotionpictures.com/en/']),
  'flow-straume': v('CORRECTED', 'Flow', 2024, ['Gints Zilbalodis'], 'Dream Well Studio', ['https://www.nkc.gov.lv/en/flow', 'https://www.nkc.gov.lv/en/article/flow-gints-zilbalodis-receives-long-standing-ovations-cannes-premiere', 'https://www.wikidata.org/wiki/Q125622088'], ['Sacrebleu Productions']),

  'spider-man-into-the-spider-verse': v('VERIFIED', 'Spider-Man: Into the Spider-Verse', 2018, ['Bob Persichetti', 'Peter Ramsey', 'Rodney Rothman'], 'Sony Pictures Animation', ['https://en.wikipedia.org/wiki/Spider-Man:_Into_the_Spider-Verse', 'https://www.sonypicturesanimation.com/projects/films/spider-man-spider-verse', 'https://www.wikidata.org/wiki/Q29588607']),
  'the-mitchells-vs-the-machines': v('VERIFIED', 'The Mitchells vs. the Machines', 2021, ['Mike Rianda', 'Jeff Rowe'], 'Sony Pictures Animation', ['https://en.wikipedia.org/wiki/The_Mitchells_vs._the_Machines', 'https://www.sonypicturesanimation.com/projects/films/themitchellsvsthemachines']),
  'the-bad-guys': v('VERIFIED', 'The Bad Guys', 2022, ['Pierre Perifel'], 'DreamWorks Animation', ['https://en.wikipedia.org/wiki/The_Bad_Guys_(film)', 'https://dreamworks.fandom.com/wiki/The_Bad_Guys_(film)']),
  'puss-in-boots-the-last-wish': v('VERIFIED', 'Puss in Boots: The Last Wish', 2022, ['Joel Crawford'], 'DreamWorks Animation', ['https://en.wikipedia.org/wiki/Puss_in_Boots:_The_Last_Wish', 'https://bfidatadigipres.github.io/bfi%20families/2023/06/25/puss-in-boots/', 'https://dreamworks.fandom.com/wiki/Puss_in_Boots:_The_Last_Wish']),
  'spider-man-across-the-spider-verse': v('VERIFIED', 'Spider-Man: Across the Spider-Verse', 2023, ['Joaquim Dos Santos', 'Kemp Powers', 'Justin K. Thompson'], 'Sony Pictures Animation', ['https://en.wikipedia.org/wiki/Spider-Man:_Across_the_Spider-Verse', 'https://www.sonypicturesanimation.com/projects/films/spider-man-spider-verse-sequel']),
  'teenage-mutant-ninja-turtles-mutant-mayhem': v('VERIFIED', 'Teenage Mutant Ninja Turtles: Mutant Mayhem', 2023, ['Jeff Rowe', 'Kyler Spears'], 'Paramount Pictures', ['https://en.wikipedia.org/wiki/Teenage_Mutant_Ninja_Turtles:_Mutant_Mayhem', 'https://paramountanimation.fandom.com/wiki/Teenage_Mutant_Ninja_Turtles:_Mutant_Mayhem']),
  'the-wild-robot': v('VERIFIED', 'The Wild Robot', 2024, ['Chris Sanders'], 'DreamWorks Animation', ['https://en.wikipedia.org/wiki/The_Wild_Robot', 'https://www.flickeringmyth.com/bfi-london-film-festival-2024-review-the-wild-robot/', 'https://dreamworks.fandom.com/wiki/The_Wild_Robot']),
};

export const catalogVerificationSummary = {
  titleCount: Object.keys(catalogVerification).length,
  statusCounts: Object.values(catalogVerification).reduce((counts, entry) => {
    counts[entry.status] = (counts[entry.status] || 0) + 1;
    return counts;
  }, {}),
  sourceMethod: 'Iris search-result verification in eight batches; source URLs are retained for independent resolution checks.',
  activeFieldBoundary: ['title', 'year', 'directors', 'studio_or_producer'],
  intentionallyUnverified: ['premise', 'visualStyle', 'audienceProfile', 'age', 'content note', 'themes unless editorially curated'],
};
