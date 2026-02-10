export function LetterFormelle({ data }) {
  if (!data) return null;

  return (
    <div className="lt-tpl lt-formelle">
      <div className="lt-formelle-sender">
        {data.senderName && <strong>{data.senderName}</strong>}
        {data.senderAddress && <p>{data.senderAddress}</p>}
        {data.senderPhone && <p>{data.senderPhone}</p>}
        {data.senderEmail && <p>{data.senderEmail}</p>}
      </div>
      <div className="lt-formelle-recipient">
        {data.recipientName && <strong>{data.recipientName}</strong>}
        {data.recipientCompany && <p>{data.recipientCompany}</p>}
        {data.recipientAddress && <p>{data.recipientAddress}</p>}
      </div>
      <div className="lt-formelle-meta">
        {(data.location || data.date) && (
          <p className="lt-formelle-date">
            {[data.location, data.date].filter(Boolean).join(', le ')}
          </p>
        )}
        {data.subject && <p className="lt-formelle-subject">Objet : {data.subject}</p>}
      </div>
      <div className="lt-formelle-body">
        {data.greeting && <p className="lt-formelle-greeting">{data.greeting}</p>}
        {data.paragraphs?.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {data.closing && <p className="lt-formelle-closing">{data.closing}</p>}
        {data.signature && <p className="lt-formelle-signature">{data.signature}</p>}
      </div>
    </div>
  );
}

export function LetterModerne({ data }) {
  if (!data) return null;

  return (
    <div className="lt-tpl lt-moderne">
      <div className="lt-moderne-header">
        <div className="lt-moderne-sender-block">
          {data.senderName && <h2>{data.senderName}</h2>}
          <div className="lt-moderne-sender-info">
            {data.senderEmail && <span>{data.senderEmail}</span>}
            {data.senderPhone && <span>{data.senderPhone}</span>}
            {data.senderAddress && <span>{data.senderAddress}</span>}
          </div>
        </div>
      </div>
      <div className="lt-moderne-content">
        <div className="lt-moderne-recipient-block">
          {data.recipientCompany && <strong>{data.recipientCompany}</strong>}
          {data.recipientName && <p>{data.recipientName}</p>}
          {data.recipientAddress && <p>{data.recipientAddress}</p>}
        </div>
        <div className="lt-moderne-meta">
          {(data.location || data.date) && (
            <p>{[data.location, data.date].filter(Boolean).join(', le ')}</p>
          )}
        </div>
        {data.subject && <p className="lt-moderne-subject">{data.subject}</p>}
        <div className="lt-moderne-body">
          {data.greeting && <p className="lt-moderne-greeting">{data.greeting}</p>}
          {data.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {data.closing && <p className="lt-moderne-closing">{data.closing}</p>}
        </div>
        {data.signature && <p className="lt-moderne-signature">{data.signature}</p>}
      </div>
    </div>
  );
}

export const LETTER_TEMPLATES = [
  { id: 'formelle', name: 'Formelle', component: LetterFormelle },
  { id: 'moderne', name: 'Moderne', component: LetterModerne }
];
