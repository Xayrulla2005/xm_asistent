import PlaceholderPage from '../PlaceholderPage';

export default function Courses() {
  return (
    <PlaceholderPage
      name="Kurslar"
      columns={['Kurs nomi', "O'qituvchi", 'Talabalar', 'Davomiyligi']}
      rows={[
        ['Ingliz tili (Boshlang\'ich)', 'Karimova N.', '24 kishi', '3 oy'],
        ['Matematika (O\'rta)',          'Toshmatov B.', '18 kishi', '6 oy'],
        ['Dasturlash (Python)',          'Rahimov A.',   '15 kishi', '4 oy'],
      ]}
    />
  );
}
