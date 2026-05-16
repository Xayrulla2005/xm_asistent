import PlaceholderPage from '../PlaceholderPage';

export default function Kitchen() {
  return (
    <PlaceholderPage
      name="Oshxona"
      columns={['Buyurtma', 'Taom', 'Stol', 'Vaqt', 'Holat']}
      rows={[
        ['#1042', 'Osh (x2)',      'Stol 3', '12:34', 'Pishirilmoqda'],
        ['#1043', "Lag'mon (x1)", 'Stol 7', '12:41', 'Tayyor'],
        ['#1044', 'Sho\'rva (x3)', 'Stol 1', '12:45', 'Kutilmoqda'],
      ]}
    />
  );
}
