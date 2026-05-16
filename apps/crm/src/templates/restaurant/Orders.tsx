import PlaceholderPage from '../PlaceholderPage';

export default function Orders() {
  return (
    <PlaceholderPage
      name="Buyurtmalar"
      columns={['Stol', 'Ofitsiant', "Summa (so'm)", 'Holat']}
      rows={[
        ['Stol 3', 'Jasur',  '128 000', 'Tayyorlanmoqda'],
        ['Stol 7', 'Malika', '85 000',  'Tayyor'],
        ['Stol 1', 'Jasur',  '210 000', "To'langan"],
      ]}
    />
  );
}
