import PlaceholderPage from '../PlaceholderPage';

export default function Teachers() {
  return (
    <PlaceholderPage
      name="O'qituvchilar"
      columns={['Ism', 'Fan', 'Tajriba', 'Guruhlar']}
      rows={[
        ['Karimova Nilufar',  'Ingliz tili',  '7 yil', '4 guruh'],
        ['Toshmatov Bekzod',  'Matematika',   '5 yil', '3 guruh'],
        ['Rahimov Alisher',   'Dasturlash',   '4 yil', '2 guruh'],
      ]}
    />
  );
}
