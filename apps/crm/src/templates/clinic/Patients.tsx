import PlaceholderPage from '../PlaceholderPage';

export default function Patients() {
  return (
    <PlaceholderPage
      name="Bemorlar"
      columns={['ID', 'Ism', "Tug'ilgan kun", 'Shifokor', 'Holat']}
      rows={[
        ['001', 'Alisher Karimov',  '1990-05-12', 'Dr. Ismoilov',  'Faol'],
        ['002', 'Malika Yusupova',  '1985-09-23', 'Dr. Rahimova',  'Faol'],
        ['003', 'Bobur Toshmatov',  '1995-03-07', 'Dr. Ismoilov',  'Bitgan'],
      ]}
    />
  );
}
