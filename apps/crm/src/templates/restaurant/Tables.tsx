import PlaceholderPage from '../PlaceholderPage';

export default function Tables() {
  return (
    <PlaceholderPage
      name="Stollar"
      columns={["Stol raqami", "Sig'im", 'Holat', 'Ofitsiant']}
      rows={[
        ['Stol 1', '4 kishi', 'Band',    'Jasur'],
        ['Stol 2', '2 kishi', 'Bosh',    '—'],
        ['Stol 3', '6 kishi', 'Band',    'Malika'],
        ['Stol 4', '4 kishi', 'Bron',    'Jasur'],
      ]}
    />
  );
}
