import PlaceholderPage from '../PlaceholderPage';

export default function Doctors() {
  return (
    <PlaceholderPage
      name="Shifokorlar"
      columns={['Ism', 'Mutaxassislik', 'Kabinet', 'Tajriba']}
      rows={[
        ['Dr. Ismoilov Sardor',  'Terapevt',   '101', '12 yil'],
        ['Dr. Rahimova Nodira',  'Pediatr',     '203', '8 yil'],
        ['Dr. Toshmatov Bekzod', 'Kardiolog',   '305', '15 yil'],
      ]}
    />
  );
}
