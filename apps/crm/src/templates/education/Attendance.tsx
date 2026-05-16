import PlaceholderPage from '../PlaceholderPage';

export default function Attendance() {
  return (
    <PlaceholderPage
      name="Davomat"
      columns={['Sana', 'Guruh', 'Fan', 'Davomat %', 'Sababsiz']}
      rows={[
        ['16.05.2026', 'G-101', 'Ingliz tili',  '92%', '2 kishi'],
        ['16.05.2026', 'G-203', 'Matematika',   '85%', '3 kishi'],
        ['15.05.2026', 'G-305', 'Dasturlash',   '100%', '0 kishi'],
      ]}
    />
  );
}
