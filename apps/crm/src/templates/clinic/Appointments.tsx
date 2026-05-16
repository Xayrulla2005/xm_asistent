import PlaceholderPage from '../PlaceholderPage';

export default function Appointments() {
  return (
    <PlaceholderPage
      name="Qabullar"
      columns={['Sana', 'Bemor', 'Shifokor', 'Xona', 'Holat']}
      rows={[
        ['16.05.2026 09:00', 'Alisher Karimov', 'Dr. Ismoilov', '101', 'Kutilmoqda'],
        ['16.05.2026 10:30', 'Dilnoza Rahimova', 'Dr. Rahimova', '203', 'Tasdiqlangan'],
        ['16.05.2026 14:00', 'Jasur Normatov',  'Dr. Ismoilov', '101', 'Bajarildi'],
      ]}
    />
  );
}
