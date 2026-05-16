interface Props {
  name: string;
  description?: string;
  columns?: string[];
  rows?: string[][];
}

export default function PlaceholderPage({ name, description, columns = [], rows = [] }: Props) {
  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">{name}</h2>
      </div>
      <p className="state-msg" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {description ?? "Tez kunda to'liq versiya"}
      </p>
      {columns.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
