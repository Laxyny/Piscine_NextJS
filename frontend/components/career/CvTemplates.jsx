function SafeList({ items, renderItem }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.map((item, i) => renderItem(item, i));
}

function formatDate(d) {
  if (!d) return '';
  if (d.toLowerCase() === 'present' || d.toLowerCase() === 'actuel') return 'Present';
  return d;
}

function DateRange({ start, end }) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s && !e) return null;
  return <span>{s}{e ? ` - ${e}` : ''}</span>;
}

export function CvModerne({ data }) {
  if (!data) return null;
  const b = data.basics || {};
  const loc = b.location || {};

  return (
    <div className="cv-tpl cv-moderne">
      <div className="cv-moderne-sidebar">
        <div className="cv-moderne-sidebar-name">{b.name || 'Nom Prenom'}</div>
        {b.summary && <p className="cv-moderne-sidebar-summary">{b.summary}</p>}
        <div className="cv-moderne-sidebar-section">
          <h3>Contact</h3>
          {b.email && <p>{b.email}</p>}
          {b.phone && <p>{b.phone}</p>}
          {(loc.address || loc.city) && <p>{[loc.address, loc.postalCode, loc.city].filter(Boolean).join(', ')}</p>}
          {b.url && <p>{b.url}</p>}
          {b.birthDate && <p>Ne(e) le {b.birthDate}</p>}
          <SafeList items={b.profiles} renderItem={(p, i) => (
            <p key={i}>{p.network}: {p.url}</p>
          )} />
        </div>
        {data.skills?.length > 0 && (
          <div className="cv-moderne-sidebar-section">
            <h3>Competences</h3>
            <SafeList items={data.skills} renderItem={(s, i) => (
              <div key={i} className="cv-moderne-skill-group">
                {s.name && <strong>{s.name}</strong>}
                {s.keywords?.length > 0 && (
                  <div className="cv-moderne-tags">
                    {s.keywords.map((k, j) => <span key={j} className="cv-moderne-tag">{k}</span>)}
                  </div>
                )}
              </div>
            )} />
          </div>
        )}
        {data.languages?.length > 0 && (
          <div className="cv-moderne-sidebar-section">
            <h3>Langues</h3>
            <SafeList items={data.languages} renderItem={(l, i) => (
              <p key={i}>{l.language}{l.fluency ? ` - ${l.fluency}` : ''}</p>
            )} />
          </div>
        )}
        {data.interests?.length > 0 && (
          <div className="cv-moderne-sidebar-section">
            <h3>Centres d'interet</h3>
            <p>{data.interests.map(i => i.name).filter(Boolean).join(', ')}</p>
          </div>
        )}
      </div>
      <div className="cv-moderne-main">
        {data.work?.length > 0 && (
          <div className="cv-moderne-section">
            <h2>Experiences professionnelles</h2>
            <SafeList items={data.work} renderItem={(w, i) => (
              <div key={i} className="cv-moderne-entry">
                <div className="cv-moderne-entry-header">
                  <strong>{w.position}</strong>
                  <span className="cv-moderne-date"><DateRange start={w.startDate} end={w.endDate} /></span>
                </div>
                <div className="cv-moderne-entry-sub">{[w.company, w.location].filter(Boolean).join(' - ')}</div>
                {w.summary && <p>{w.summary}</p>}
                {w.highlights?.length > 0 && (
                  <ul>{w.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                )}
              </div>
            )} />
          </div>
        )}
        {data.education?.length > 0 && (
          <div className="cv-moderne-section">
            <h2>Formation</h2>
            <SafeList items={data.education} renderItem={(e, i) => (
              <div key={i} className="cv-moderne-entry">
                <div className="cv-moderne-entry-header">
                  <strong>{[e.studyType, e.area].filter(Boolean).join(' - ')}</strong>
                  <span className="cv-moderne-date"><DateRange start={e.startDate} end={e.endDate} /></span>
                </div>
                <div className="cv-moderne-entry-sub">{[e.institution, e.location].filter(Boolean).join(' - ')}</div>
              </div>
            )} />
          </div>
        )}
        {data.projects?.length > 0 && data.projects.some(p => p.name) && (
          <div className="cv-moderne-section">
            <h2>Projets</h2>
            <SafeList items={data.projects} renderItem={(p, i) => (
              <div key={i} className="cv-moderne-entry">
                <strong>{p.name}</strong>
                {p.description && <p>{p.description}</p>}
                {p.highlights?.length > 0 && (
                  <ul>{p.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                )}
              </div>
            )} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CvClassique({ data }) {
  if (!data) return null;
  const b = data.basics || {};
  const loc = b.location || {};

  return (
    <div className="cv-tpl cv-classique">
      <div className="cv-classique-header">
        <h1>{b.name || 'Nom Prenom'}</h1>
        <div className="cv-classique-contact">
          {[b.email, b.phone, [loc.address, loc.postalCode, loc.city].filter(Boolean).join(' '), b.url, b.birthDate ? `Ne(e) le ${b.birthDate}` : ''].filter(Boolean).join('  |  ')}
        </div>
        <SafeList items={b.profiles} renderItem={(p, i) => (
          <span key={i} className="cv-classique-profile">{p.network}: {p.url}</span>
        )} />
      </div>
      {b.summary && (
        <div className="cv-classique-section">
          <h2>Profil</h2>
          <p>{b.summary}</p>
        </div>
      )}
      {data.work?.length > 0 && (
        <div className="cv-classique-section">
          <h2>Experiences professionnelles</h2>
          <SafeList items={data.work} renderItem={(w, i) => (
            <div key={i} className="cv-classique-entry">
              <div className="cv-classique-entry-line">
                <strong>{w.position}</strong>
                <span><DateRange start={w.startDate} end={w.endDate} /></span>
              </div>
              <div className="cv-classique-entry-company">{[w.company, w.location].filter(Boolean).join(', ')}</div>
              {w.summary && <p>{w.summary}</p>}
              {w.highlights?.length > 0 && (
                <ul>{w.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
              )}
            </div>
          )} />
        </div>
      )}
      {data.education?.length > 0 && (
        <div className="cv-classique-section">
          <h2>Formation</h2>
          <SafeList items={data.education} renderItem={(e, i) => (
            <div key={i} className="cv-classique-entry">
              <div className="cv-classique-entry-line">
                <strong>{[e.studyType, e.area].filter(Boolean).join(' - ')}</strong>
                <span><DateRange start={e.startDate} end={e.endDate} /></span>
              </div>
              <div className="cv-classique-entry-company">{[e.institution, e.location].filter(Boolean).join(', ')}</div>
            </div>
          )} />
        </div>
      )}
      {data.skills?.length > 0 && (
        <div className="cv-classique-section">
          <h2>Competences</h2>
          <SafeList items={data.skills} renderItem={(s, i) => (
            <div key={i} className="cv-classique-skill-row">
              {s.name && <strong>{s.name} : </strong>}
              {s.keywords?.join(', ')}
            </div>
          )} />
        </div>
      )}
      {data.languages?.length > 0 && (
        <div className="cv-classique-section">
          <h2>Langues</h2>
          <p>{data.languages.map(l => `${l.language}${l.fluency ? ` (${l.fluency})` : ''}`).join(', ')}</p>
        </div>
      )}
      {data.interests?.length > 0 && (
        <div className="cv-classique-section">
          <h2>Centres d'interet</h2>
          <p>{data.interests.map(i => i.name).filter(Boolean).join(', ')}</p>
        </div>
      )}
      {data.projects?.length > 0 && data.projects.some(p => p.name) && (
        <div className="cv-classique-section">
          <h2>Projets</h2>
          <SafeList items={data.projects} renderItem={(p, i) => (
            <div key={i} className="cv-classique-entry">
              <strong>{p.name}</strong>
              {p.description && <p>{p.description}</p>}
              {p.highlights?.length > 0 && (
                <ul>{p.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
              )}
            </div>
          )} />
        </div>
      )}
    </div>
  );
}

export function CvElegant({ data }) {
  if (!data) return null;
  const b = data.basics || {};
  const loc = b.location || {};

  return (
    <div className="cv-tpl cv-elegant">
      <div className="cv-elegant-header">
        <h1>{b.name || 'Nom Prenom'}</h1>
        {b.summary && <p className="cv-elegant-summary">{b.summary}</p>}
        <div className="cv-elegant-contact">
          {b.email && <span>{b.email}</span>}
          {b.phone && <span>{b.phone}</span>}
          {loc.city && <span>{[loc.address, loc.postalCode, loc.city].filter(Boolean).join(', ')}</span>}
          {b.url && <span>{b.url}</span>}
          {b.birthDate && <span>Ne(e) le {b.birthDate}</span>}
        </div>
      </div>
      <div className="cv-elegant-body">
        <div className="cv-elegant-left">
          {data.work?.length > 0 && (
            <div className="cv-elegant-section">
              <h2>Experiences</h2>
              <SafeList items={data.work} renderItem={(w, i) => (
                <div key={i} className="cv-elegant-entry">
                  <div className="cv-elegant-entry-date"><DateRange start={w.startDate} end={w.endDate} /></div>
                  <div className="cv-elegant-entry-content">
                    <strong>{w.position}</strong>
                    <div className="cv-elegant-entry-sub">{[w.company, w.location].filter(Boolean).join(' - ')}</div>
                    {w.summary && <p>{w.summary}</p>}
                    {w.highlights?.length > 0 && (
                      <ul>{w.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                    )}
                  </div>
                </div>
              )} />
            </div>
          )}
          {data.education?.length > 0 && (
            <div className="cv-elegant-section">
              <h2>Formation</h2>
              <SafeList items={data.education} renderItem={(e, i) => (
                <div key={i} className="cv-elegant-entry">
                  <div className="cv-elegant-entry-date"><DateRange start={e.startDate} end={e.endDate} /></div>
                  <div className="cv-elegant-entry-content">
                    <strong>{[e.studyType, e.area].filter(Boolean).join(' - ')}</strong>
                    <div className="cv-elegant-entry-sub">{[e.institution, e.location].filter(Boolean).join(' - ')}</div>
                  </div>
                </div>
              )} />
            </div>
          )}
          {data.projects?.length > 0 && data.projects.some(p => p.name) && (
            <div className="cv-elegant-section">
              <h2>Projets</h2>
              <SafeList items={data.projects} renderItem={(p, i) => (
                <div key={i} className="cv-elegant-entry">
                  <div className="cv-elegant-entry-content">
                    <strong>{p.name}</strong>
                    {p.description && <p>{p.description}</p>}
                  </div>
                </div>
              )} />
            </div>
          )}
        </div>
        <div className="cv-elegant-right">
          {data.skills?.length > 0 && (
            <div className="cv-elegant-section">
              <h2>Competences</h2>
              <SafeList items={data.skills} renderItem={(s, i) => (
                <div key={i} className="cv-elegant-skill">
                  {s.name && <strong>{s.name}</strong>}
                  {s.keywords?.length > 0 && (
                    <div className="cv-elegant-tags">
                      {s.keywords.map((k, j) => <span key={j}>{k}</span>)}
                    </div>
                  )}
                </div>
              )} />
            </div>
          )}
          {data.languages?.length > 0 && (
            <div className="cv-elegant-section">
              <h2>Langues</h2>
              <SafeList items={data.languages} renderItem={(l, i) => (
                <p key={i}><strong>{l.language}</strong>{l.fluency ? ` - ${l.fluency}` : ''}</p>
              )} />
            </div>
          )}
          {data.interests?.length > 0 && (
            <div className="cv-elegant-section">
              <h2>Interets</h2>
              <p>{data.interests.map(i => i.name).filter(Boolean).join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const CV_TEMPLATES = [
  { id: 'moderne', name: 'Moderne', component: CvModerne },
  { id: 'classique', name: 'Classique', component: CvClassique },
  { id: 'elegant', name: 'Elegant', component: CvElegant }
];
