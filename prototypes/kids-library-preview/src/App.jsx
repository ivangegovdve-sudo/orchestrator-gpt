import { useEffect, useMemo, useRef, useState } from 'react';
import { ages, assetUrl, availabilityUrl, countries, filterMovies, movies, themes } from './library';

function SvgIcon({ size = 24, children, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}
const ArrowRight = ({ size = 24, ...props }) => <SvgIcon size={size} {...props}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></SvgIcon>;
const ArrowSquareOut = ({ size = 24, ...props }) => <SvgIcon size={size} {...props}><path d="M14 5h5v5" /><path d="m13 11 6-6" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></SvgIcon>;
const BookOpen = ({ size = 48, weight: _weight, ...props }) => <SvgIcon size={size} {...props}><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5A2.5 2.5 0 0 1 21 22z" /></SvgIcon>;
const CaretDown = ({ size = 24, ...props }) => <SvgIcon size={size} {...props}><path d="m6 9 6 6 6-6" /></SvgIcon>;
const MagnifyingGlass = ({ size = 24, ...props }) => <SvgIcon size={size} {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></SvgIcon>;
const X = ({ size = 24, ...props }) => <SvgIcon size={size} {...props}><path d="m6 6 12 12M18 6 6 18" /></SvgIcon>;

const initial = new URLSearchParams(window.location.search);
const valid = (value, options, fallback) => options.includes(value) ? value : fallback;
const readIdSet = key => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
};

function MediaTabs({ medium, onChange, location }) {
  return <div className={`media-tabs media-tabs--${location}`} aria-label="Library collection">{['movies', 'books'].map(value => <button key={value} type="button" aria-pressed={medium === value} className={medium === value ? 'is-active' : ''} onClick={() => onChange(value)}>{value === 'movies' ? 'Movies' : 'Books'}</button>)}</div>;
}
function CountrySelect({ value, onChange, id = 'country' }) {
  return <label className="country-control" htmlFor={id}><span>Viewing country:</span><span className="select-wrap"><select id={id} value={value} onChange={event => onChange(event.target.value)}><option value="">Choose country</option>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select><CaretDown size={20} aria-hidden="true" /></span></label>;
}
function ArtworkPlaceholder({ movie }) {
  return <span className="artwork-placeholder artwork-placeholder--turned-away"><strong>Original artwork pending</strong><span>{movie.title}</span><small>The generated image set is not available for this title yet.</small></span>;
}
function MovieArt({ movie, location, interactive = true }) {
  const inner = <span className="movie-art__inner"><span className="movie-art__face movie-art__face--turned-away">{movie.characterImage ? <img src={movie.characterImage} alt={movie.imageDescription} width="1672" height="941" /> : <ArtworkPlaceholder movie={movie} />}</span></span>;
  return <div className={`movie-art movie-art--${location} ${movie.artworkStatus === 'pending' ? 'is-pending' : ''}`} data-movie-id={movie.id} data-art-state="original">{interactive && movie.imdbUrl ? <a className="movie-art__link" href={movie.imdbUrl} target="_blank" rel="noreferrer" aria-label={`Open IMDb poster and title page for ${movie.title}`}>{inner}</a> : inner}</div>;
}
function FilmDetail({ movie, country, onAvailability, isWatched, onToggleWatched }) {
  return <article className="film-detail" aria-labelledby="selected-film-title"><div className="film-copy">
    <h2 id="selected-film-title">{movie.title} ({movie.year ?? 'year unverified'})</h2>
    <p className="film-meta">{movie.studio}<span> · </span>{movie.directors}<span> · </span>{movie.runtime ? `${movie.runtime} min` : 'Runtime pending'}</p>
    <div className="parent-guidance"><p><strong>Source check:</strong> {movie.verificationStatus}. {movie.verificationNote || ''}{movie.unverifiedFields?.length ? ` Unverified here: ${movie.unverifiedFields.join(', ')}.` : ''}</p><p><strong>Age {movie.age}:</strong> {movie.ageReason}</p><p><strong>Worth their time:</strong> {movie.value}</p><p><strong>Content note:</strong> {movie.content}</p><p><strong>Where to watch:</strong> {country ? `Check current streaming and rental options in ${countries.find(([code]) => code === country)?.[1]}.` : 'Choose a country for current streaming and rental options.'}</p></div>
    <div className="detail-actions"><button className="primary-action" type="button" onClick={onAvailability}>Check availability <ArrowRight size={25} aria-hidden="true" /></button><button className="secondary-action" type="button" aria-pressed={isWatched} onClick={onToggleWatched}>{isWatched ? 'Watched' : 'Mark watched'}</button>{movie.imdbUrl && <a className="research-link imdb-link" href={movie.imdbUrl} target="_blank" rel="noreferrer"><strong>IMDb:</strong> Open poster & title page <ArrowSquareOut size={18} aria-hidden="true" /></a>}{movie.sourceUrls?.[0] && <a className="research-link" href={movie.sourceUrls[0]} target="_blank" rel="noreferrer"><strong>Source:</strong> Iris-checked record <ArrowSquareOut size={18} aria-hidden="true" /></a>}</div>
  </div><div className="detail-art"><MovieArt movie={movie} location="detail" /><span className="screen-reader-status" aria-live="polite">Original artwork for {movie.title}. Click the artwork to open its IMDb poster and title page.</span></div></article>;
}
const information = {
  about: { title: 'Stories worth growing with', paragraphs: ['SD Forest’s Kids’ Library helps families find films and books that build curiosity, kindness, courage, and understanding.', 'The movie collection indexes the titled research entries with an Iris-checked source ledger. Source facts are kept separate from parent guidance, and unsupported fields remain labeled.'] },
  parents: { title: 'A note for parents', paragraphs: ['Age bands are a starting point, not a rule. You know your child’s sensitivities, experiences, and questions best.', 'Read the content note before choosing. Watching together makes space to pause, explain, or decide that a story can wait.', 'Availability changes by country and over time. Choose a viewing country, then check the current listings before making plans.'] },
  library: { title: 'Inside the library', paragraphs: ['Movies and Books are separate collections with the same ages and themes, so you can approach a feeling through either medium.', 'The movie shelf uses original SD Forest illustrations. Click a title’s artwork to open its IMDb poster and title page; no official poster art is bundled here.', 'The book shelf is awaiting its own curated research. Book recommendations will appear only when their sources and parent guidance are ready.'] },
};
export function App() {
  const [medium, setMedium] = useState(initial.get('shelf') === 'books' ? 'books' : 'movies');
  const [query, setQuery] = useState(initial.get('q') || '');
  const [theme, setTheme] = useState(valid(initial.get('theme'), themes, 'All Themes'));
  const [age, setAge] = useState(valid(initial.get('age'), ages, 'All'));
  const [country, setCountry] = useState(valid(initial.get('country'), countries.map(([code]) => code), ''));
  const [selectedId, setSelectedId] = useState(valid(initial.get('film'), movies.map(movie => movie.id), 'iron-giant'));
  const [watchedIds, setWatchedIds] = useState(() => readIdSet('kidsLibraryWatched'));
  const [dialog, setDialog] = useState(null);
  const [countryError, setCountryError] = useState(false);
  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const films = useMemo(() => filterMovies({ query, age, theme }), [query, age, theme]);
  const selected = movies.find(movie => movie.id === selectedId) || movies[0];
  const selectMovie = movie => setSelectedId(movie.id);
  const toggleWatched = id => {
    setWatchedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  useEffect(() => { window.localStorage.setItem('kidsLibraryWatched', JSON.stringify([...watchedIds])); }, [watchedIds]);
  useEffect(() => { if (films.length && !films.some(movie => movie.id === selectedId)) setSelectedId(films[0].id); }, [films, selectedId]);
  useEffect(() => {
    if (window.matchMedia('(max-width: 650px)').matches) {
      const strip = document.querySelector('.film-strip');
      const item = strip?.querySelector('.is-selected');
      if (strip && item) strip.scrollTo({ left: item.offsetLeft - strip.offsetLeft - (strip.clientWidth - item.clientWidth) / 2, behavior: 'instant' });
    }
  }, [selectedId, medium, films]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (medium === 'books') params.set('shelf', 'books');
    if (query) params.set('q', query);
    if (theme !== 'All Themes') params.set('theme', theme);
    if (age !== 'All') params.set('age', age);
    if (country) params.set('country', country);
    if (selectedId !== 'iron-giant') params.set('film', selectedId);
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }, [medium, query, theme, age, country, selectedId]);
  useEffect(() => { const node = dialogRef.current; if (dialog && !node.open) node.showModal(); else if (!dialog && node.open) node.close(); }, [dialog]);
  const setViewingCountry = value => { setCountry(value); setCountryError(false); };
  const resetFilters = () => { setQuery(''); setTheme('All Themes'); setAge('All'); };
  const checkAvailability = () => { if (!country) { setDialog('availability'); setCountryError(false); return; } window.open(availabilityUrl(selected, country), '_blank', 'noopener,noreferrer'); };
  const dialogInfo = information[dialog];
  return <><a className="skip-link" href="#library">Skip to the library</a>
    <header className="site-header"><a className="brand" href="/web/kids-library-preview/" aria-label="SD Forest Kids’ Library home" onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setMedium('movies'); resetFilters(); setSelectedId('iron-giant'); window.scrollTo({ top: 0, behavior: 'instant' }); }}><img src={assetUrl('trees.webp')} alt="" width="64" height="64" /><span className="brand-words"><span>SD Forest</span><small>Kids’ Library</small></span></a><MediaTabs medium={medium} onChange={setMedium} location="header" /><nav className="site-navigation" aria-label="About the library"><button onClick={() => setDialog('about')}>About</button><button onClick={() => setDialog('parents')}>For Parents</button><button onClick={() => setDialog('library')}>Library Info</button><button className="icon-button" aria-label="Search the library" onClick={() => searchRef.current?.focus()}><MagnifyingGlass size={25} aria-hidden="true" /></button></nav></header>
    <p className="preview-notice">Original SD Forest artwork · {movies.length} films · click artwork for the IMDb poster &amp; title page</p>
    <section className="forest-hero" aria-labelledby="library-heading"><div className="hero-scene" aria-hidden="true"><MovieArt movie={selected} location="hero" interactive={false} /></div><img className="forest-frame" src={assetUrl('forest-frame.webp')} alt="" width="2048" height="768" /><div className="hero-copy"><h1 id="library-heading">Stories<br />to grow with</h1><p>Choose a {medium === 'movies' ? 'film' : 'book'} by age or feeling.</p><form className="search-control" role="search" onSubmit={event => event.preventDefault()}><MagnifyingGlass size={28} aria-hidden="true" /><input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={`Search ${medium}`} placeholder={`Search ${medium}, ${medium === 'movies' ? 'characters' : 'authors'} or themes…`} />{query && <button type="button" className="clear-search icon-button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X size={20} /></button>}</form></div></section>
    <main id="library"><div className="library-toolbar"><MediaTabs medium={medium} onChange={setMedium} location="toolbar" /><CountrySelect value={country} onChange={setViewingCountry} /></div>
      <div className="theme-band"><strong>Explore by theme:</strong><div className="theme-options" aria-label="Filter by theme">{themes.map(value => <button type="button" key={value} aria-pressed={theme === value} className={theme === value ? 'is-active' : ''} onClick={() => setTheme(value)}>{value}</button>)}</div></div>
      <section className="library-content" aria-label={medium === 'movies' ? 'Movie collection' : 'Book collection'}><div className="age-row"><strong>Ages:</strong><div aria-label="Filter by age">{ages.map(value => <button key={value} type="button" aria-pressed={age === value} className={age === value ? 'is-active' : ''} onClick={() => setAge(value)}>{value}</button>)}</div></div>
        <div className="screen-reader-status" role="status" aria-live="polite">{medium === 'movies' ? `${films.length} ${films.length === 1 ? 'film' : 'films'} found. ${films.length ? `${selected.title} selected.` : ''}` : 'The book shelf is awaiting curated recommendations.'}</div>
        {medium === 'books' ? <section className="empty-shelf books-shelf"><BookOpen size={48} weight="duotone" aria-hidden="true" /><h2>A new chapter is coming</h2><p>The book shelf is being curated with the same care: age guidance, the feelings a story builds, and an honest note about difficult moments.</p><p>For now, there are stories waiting on the movie shelf.</p><button className="primary-action" onClick={() => setMedium('movies')}>Explore movies <ArrowRight size={23} aria-hidden="true" /></button></section> : films.length ? <><div className="film-strip" aria-label="Choose a film">{films.map(movie => <div className={`film-option ${selected.id === movie.id ? 'is-selected' : ''}`} key={movie.id}><span className="thumbnail-frame"><MovieArt movie={movie} location="thumbnail" /></span><button className="film-option__select" type="button" aria-pressed={selected.id === movie.id} onClick={() => selectMovie(movie)}>{movie.title}{movie.id !== 'ernest-celestine' && ` (${movie.year ?? 'year unverified'})`}</button></div>)}</div><FilmDetail movie={selected} country={country} isWatched={watchedIds.has(selected.id)} onToggleWatched={() => toggleWatched(selected.id)} onAvailability={checkAvailability} /></> : <section className="empty-shelf"><h2>No films on this shelf yet</h2><p>Try another age or theme, or clear your search to see the collection.</p><button className="primary-action" onClick={resetFilters}>Clear filters <ArrowRight size={23} aria-hidden="true" /></button></section>}
      </section></main>
    <dialog ref={dialogRef} className="library-dialog" onClose={() => setDialog(null)} onClick={event => { if (event.target === event.currentTarget) setDialog(null); }} aria-labelledby="dialog-title"><button className="dialog-close icon-button" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={25} /></button>{dialog === 'availability' ? <><h2 id="dialog-title">Where will you be watching?</h2><p>Services change from country to country. Choose yours to check the current listings for <strong>{selected.title}</strong>.</p><CountrySelect id="dialog-country" value={country} onChange={setViewingCountry} />{countryError && <p className="form-error" role="alert">Choose a country before continuing.</p>}<button className="primary-action" onClick={() => { if (!country) { setCountryError(true); return; } checkAvailability(); setDialog(null); }}>Open current listings <ArrowSquareOut size={22} aria-hidden="true" /></button><p className="dialog-note">Opens JustWatch in a new tab. Listings are not a guarantee of access.</p></> : dialogInfo && <><h2 id="dialog-title">{dialogInfo.title}</h2>{dialogInfo.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<p className="dialog-note">Each title carries its Iris-checked source URL. Unsupported editorial fields remain labeled.</p></>}</dialog>
  </>;
}
