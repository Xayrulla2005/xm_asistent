import PlaceholderPage from '../PlaceholderPage';

export default function Pharmacy() {
  return (
    <PlaceholderPage
      name="Dorixona"
      columns={['Dori nomi', 'Miqdori', "Narxi (so'm)", 'Muddati']}
      rows={[
        ['Paracetamol 500mg', '150 dona', '2 500',  '2027-01'],
        ['Amoxicillin 250mg', '80 quti',  '12 000', '2026-11'],
        ['Ibuprofen 400mg',   '200 dona', '3 800',  '2027-06'],
      ]}
    />
  );
}
