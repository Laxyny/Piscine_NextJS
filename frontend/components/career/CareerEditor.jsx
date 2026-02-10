import { useState } from 'react';

function ArrayField({ items, onUpdate, renderItem, defaultItem, label }) {
  const add = () => onUpdate([...(items || []), { ...defaultItem }]);
  const remove = (idx) => onUpdate(items.filter((_, i) => i !== idx));
  const update = (idx, val) => onUpdate(items.map((item, i) => i === idx ? val : item));

  return (
    <div className="ce-array">
      {(items || []).map((item, i) => (
        <div key={i} className="ce-array-item">
          {renderItem(item, i, (val) => update(i, val))}
          <button type="button" className="ce-remove-btn" onClick={() => remove(i)}>Supprimer</button>
        </div>
      ))}
      <button type="button" className="ce-add-btn" onClick={add}>+ {label}</button>
    </div>
  );
}

function Input({ label, value, onChange, multiline }) {
  return (
    <div className="ce-field">
      <label>{label}</label>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

function KeywordsField({ label, keywords, onChange }) {
  const val = (keywords || []).join(', ');
  return (
    <Input
      label={label}
      value={val}
      onChange={v => onChange(v.split(',').map(s => s.trim()).filter(Boolean))}
    />
  );
}

function Section({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="ce-section">
      <button type="button" className="ce-section-toggle" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {open && <div className="ce-section-body">{children}</div>}
    </div>
  );
}

export function CvEditor({ data, onChange }) {
  if (!data) return null;
  const b = data.basics || {};
  const loc = b.location || {};

  const setBasics = (field, val) => {
    onChange({ ...data, basics: { ...b, [field]: val } });
  };

  const setLocation = (field, val) => {
    onChange({ ...data, basics: { ...b, location: { ...loc, [field]: val } } });
  };

  return (
    <div className="ce-editor">
      <Section title="Informations personnelles" defaultOpen={true}>
        <Input label="Nom complet" value={b.name} onChange={v => setBasics('name', v)} />
        <Input label="Email" value={b.email} onChange={v => setBasics('email', v)} />
        <Input label="Telephone" value={b.phone} onChange={v => setBasics('phone', v)} />
        <Input label="Date de naissance" value={b.birthDate} onChange={v => setBasics('birthDate', v)} />
        <Input label="Site web / Portfolio" value={b.url} onChange={v => setBasics('url', v)} />
        <Input label="Adresse" value={loc.address} onChange={v => setLocation('address', v)} />
        <Input label="Code postal" value={loc.postalCode} onChange={v => setLocation('postalCode', v)} />
        <Input label="Ville" value={loc.city} onChange={v => setLocation('city', v)} />
        <Input label="Resume professionnel" value={b.summary} onChange={v => setBasics('summary', v)} multiline />
      </Section>

      <Section title="Experiences professionnelles">
        <ArrayField
          items={data.work}
          label="Ajouter une experience"
          defaultItem={{ company: '', position: '', location: '', startDate: '', endDate: '', summary: '', highlights: [] }}
          onUpdate={v => onChange({ ...data, work: v })}
          renderItem={(w, i, upd) => (
            <div className="ce-subform">
              <Input label="Poste" value={w.position} onChange={v => upd({ ...w, position: v })} />
              <Input label="Entreprise" value={w.company} onChange={v => upd({ ...w, company: v })} />
              <Input label="Lieu" value={w.location} onChange={v => upd({ ...w, location: v })} />
              <div className="ce-row">
                <Input label="Debut" value={w.startDate} onChange={v => upd({ ...w, startDate: v })} />
                <Input label="Fin" value={w.endDate} onChange={v => upd({ ...w, endDate: v })} />
              </div>
              <Input label="Description" value={w.summary} onChange={v => upd({ ...w, summary: v })} multiline />
              <KeywordsField label="Realisations (separees par des virgules)" keywords={w.highlights} onChange={v => upd({ ...w, highlights: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Formation">
        <ArrayField
          items={data.education}
          label="Ajouter une formation"
          defaultItem={{ institution: '', area: '', studyType: '', startDate: '', endDate: '', location: '' }}
          onUpdate={v => onChange({ ...data, education: v })}
          renderItem={(e, i, upd) => (
            <div className="ce-subform">
              <Input label="Diplome" value={e.studyType} onChange={v => upd({ ...e, studyType: v })} />
              <Input label="Domaine" value={e.area} onChange={v => upd({ ...e, area: v })} />
              <Input label="Etablissement" value={e.institution} onChange={v => upd({ ...e, institution: v })} />
              <Input label="Lieu" value={e.location} onChange={v => upd({ ...e, location: v })} />
              <div className="ce-row">
                <Input label="Debut" value={e.startDate} onChange={v => upd({ ...e, startDate: v })} />
                <Input label="Fin" value={e.endDate} onChange={v => upd({ ...e, endDate: v })} />
              </div>
            </div>
          )}
        />
      </Section>

      <Section title="Competences">
        <ArrayField
          items={data.skills}
          label="Ajouter une categorie"
          defaultItem={{ name: '', keywords: [] }}
          onUpdate={v => onChange({ ...data, skills: v })}
          renderItem={(s, i, upd) => (
            <div className="ce-subform">
              <Input label="Categorie" value={s.name} onChange={v => upd({ ...s, name: v })} />
              <KeywordsField label="Competences (separees par des virgules)" keywords={s.keywords} onChange={v => upd({ ...s, keywords: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Langues">
        <ArrayField
          items={data.languages}
          label="Ajouter une langue"
          defaultItem={{ language: '', fluency: '' }}
          onUpdate={v => onChange({ ...data, languages: v })}
          renderItem={(l, i, upd) => (
            <div className="ce-subform ce-row">
              <Input label="Langue" value={l.language} onChange={v => upd({ ...l, language: v })} />
              <Input label="Niveau" value={l.fluency} onChange={v => upd({ ...l, fluency: v })} />
            </div>
          )}
        />
      </Section>

      <Section title="Centres d'interet">
        <ArrayField
          items={data.interests}
          label="Ajouter un interet"
          defaultItem={{ name: '' }}
          onUpdate={v => onChange({ ...data, interests: v })}
          renderItem={(int, i, upd) => (
            <Input label="Interet" value={int.name} onChange={v => upd({ ...int, name: v })} />
          )}
        />
      </Section>

      <Section title="Projets">
        <ArrayField
          items={data.projects}
          label="Ajouter un projet"
          defaultItem={{ name: '', description: '', highlights: [] }}
          onUpdate={v => onChange({ ...data, projects: v })}
          renderItem={(p, i, upd) => (
            <div className="ce-subform">
              <Input label="Nom du projet" value={p.name} onChange={v => upd({ ...p, name: v })} />
              <Input label="Description" value={p.description} onChange={v => upd({ ...p, description: v })} multiline />
              <KeywordsField label="Points cles (separes par des virgules)" keywords={p.highlights} onChange={v => upd({ ...p, highlights: v })} />
            </div>
          )}
        />
      </Section>
    </div>
  );
}

export function LettreEditor({ data, onChange }) {
  if (!data) return null;

  const set = (field, val) => onChange({ ...data, [field]: val });

  return (
    <div className="ce-editor">
      <Section title="Expediteur" defaultOpen={true}>
        <Input label="Nom" value={data.senderName} onChange={v => set('senderName', v)} />
        <Input label="Adresse" value={data.senderAddress} onChange={v => set('senderAddress', v)} />
        <Input label="Telephone" value={data.senderPhone} onChange={v => set('senderPhone', v)} />
        <Input label="Email" value={data.senderEmail} onChange={v => set('senderEmail', v)} />
      </Section>

      <Section title="Destinataire">
        <Input label="Nom" value={data.recipientName} onChange={v => set('recipientName', v)} />
        <Input label="Entreprise" value={data.recipientCompany} onChange={v => set('recipientCompany', v)} />
        <Input label="Adresse" value={data.recipientAddress} onChange={v => set('recipientAddress', v)} />
      </Section>

      <Section title="En-tete">
        <Input label="Lieu" value={data.location} onChange={v => set('location', v)} />
        <Input label="Date" value={data.date} onChange={v => set('date', v)} />
        <Input label="Objet" value={data.subject} onChange={v => set('subject', v)} />
        <Input label="Formule d'appel" value={data.greeting} onChange={v => set('greeting', v)} />
      </Section>

      <Section title="Corps de la lettre" defaultOpen={true}>
        <ArrayField
          items={data.paragraphs}
          label="Ajouter un paragraphe"
          defaultItem=""
          onUpdate={v => set('paragraphs', v)}
          renderItem={(p, i, upd) => (
            <div className="ce-field">
              <label>Paragraphe {i + 1}</label>
              <textarea value={p || ''} onChange={e => upd(e.target.value)} rows={4} />
            </div>
          )}
        />
      </Section>

      <Section title="Conclusion">
        <Input label="Formule de politesse" value={data.closing} onChange={v => set('closing', v)} multiline />
        <Input label="Signature" value={data.signature} onChange={v => set('signature', v)} />
      </Section>
    </div>
  );
}
