import PlaceholderPage from '../PlaceholderPage';

export default function Students() {
  return (
    <PlaceholderPage
      name="O'quvchilar"
      columns={['Ism', 'Guruh', 'Kurs', 'Daraja']}
      rows={[
        ['Alisher Karimov',  'G-101', '1-kurs', 'A2'],
        ['Malika Yusupova',  'G-203', '2-kurs', 'B1'],
        ['Bobur Toshmatov',  'G-305', '3-kurs', 'B2'],
      ]}
    />
  );
}
