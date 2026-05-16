import PlaceholderPage from '../PlaceholderPage';

export default function Menu() {
  return (
    <PlaceholderPage
      name="Menyu"
      columns={['Taom nomi', 'Kategoriya', "Narxi (so'm)", 'Mavjud']}
      rows={[
        ['Osh',              'Asosiy taom',  '35 000', 'Ha'],
        ['Lag\'mon',         'Asosiy taom',  '28 000', 'Ha'],
        ['Limonli choy',     'Ichimlik',     '8 000',  'Ha'],
      ]}
    />
  );
}
