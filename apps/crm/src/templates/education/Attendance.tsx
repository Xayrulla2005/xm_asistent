import { useEffect, useState } from 'react';
import { CalendarDays, UserCheck, UserX, Plus, Check, X as XIcon } from 'lucide-react';
import {
  AttendanceRecord, getAttendance, getAttendanceStats, bulkAttendance,
} from '../../api/education.api';
import { Student, getStudents } from '../../api/education.api';
import { Course, getCourses } from '../../api/education.api';
import { useToastStore } from '../../stores/toast.store';

const STATUS_OPTS = [
  { key: 'present', label: 'Keldi',    color: '#10b981' },
  { key: 'absent',  label: 'Kelmadi',  color: '#ef4444' },
  { key: 'late',    label: 'Kech',     color: '#f59e0b' },
  { key: 'excused', label: "Sababli",  color: '#6366f1' },
];

export default function Attendance() {
  const addToast = useToastStore((s) => s.toast);
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [stats,    setStats]    = useState<{ totalStudents: number; todayPresent: number; todayAbsent: number; totalRecords: number } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [dateFilter,   setDateFilter]   = useState(new Date().toISOString().slice(0, 10));
  const [courseFilter, setCourseFilter] = useState('');
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkDate, setBulkDate]   = useState(new Date().toISOString().slice(0, 10));
  const [bulkCourseId, setBulkCourseId] = useState('');
  const [studentStatus, setStudentStatus] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getAttendance(dateFilter || undefined, courseFilter || undefined),
      getAttendanceStats(),
      getStudents(),
      getCourses(),
    ])
      .then(([r, s, st, c]) => { setRecords(r); setStats(s); setStudents(st); setCourses(c); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFilter, courseFilter]);

  const openBulk = () => {
    const initial: Record<string, string> = {};
    students.filter((s) => s.status === 'active').forEach((s) => { initial[s.id] = 'present'; });
    setStudentStatus(initial);
    setBulkModal(true);
  };

  const handleBulkSave = async () => {
    setSaving(true);
    const records = Object.entries(studentStatus).map(([studentId, status]) => {
      const student = students.find((s) => s.id === studentId);
      const course  = courses.find((c) => c.id === bulkCourseId);
      return {
        studentId, studentName: student ? `${student.firstName} ${student.lastName}` : '',
        courseId: bulkCourseId || null, courseName: course?.name ?? null,
        date: bulkDate, status,
      };
    });
    try {
      await bulkAttendance(records);
      addToast('Davomat saqlandi', 'success');
      setBulkModal(false);
      load();
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const statusBadge = (status: string) => {
    const s = STATUS_OPTS.find((o) => o.key === status) ?? STATUS_OPTS[0];
    return (
      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: `${s.color}18`, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const activeStudents = students.filter((s) => s.status === 'active');

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Davomat</h2>
        <button className="btn-primary" onClick={openBulk} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Davomat belgilash
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: "Jami o'quvchilar", value: stats.totalStudents, color: '#6366f1' },
            { label: 'Bugun keldi', value: stats.todayPresent, color: '#10b981', Icon: UserCheck },
            { label: 'Bugun kelmadi', value: stats.todayAbsent, color: '#ef4444', Icon: UserX },
            { label: 'Jami yozuvlar', value: stats.totalRecords, color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: '0.75rem 1rem', borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarDays size={15} style={{ color: 'var(--text-muted)' }} />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: 160 }} />
        </div>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">Barcha kurslar</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(dateFilter || courseFilter) && (
          <button className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => { setDateFilter(''); setCourseFilter(''); }}>
            Filterni tozalash
          </button>
        )}
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : records.length === 0 ? <p className="state-msg">Davomat yozuvlari topilmadi</p>
       : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Sana</th><th>O'quvchi</th><th>Kurs</th><th>Holat</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.date}</td>
                  <td>{r.studentName ?? '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.courseName ?? '—'}</td>
                  <td>{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk attendance modal */}
      {bulkModal && (
        <div className="modal-overlay" onClick={() => setBulkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3>Davomat belgilash</h3>
              <button onClick={() => setBulkModal(false)}><XIcon size={18} /></button>
            </div>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <label>Sana</label>
                <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <label>Kurs</label>
                <select value={bulkCourseId} onChange={(e) => setBulkCourseId(e.target.value)}>
                  <option value="">Barcha o'quvchilar</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem 1.25rem' }}>
              {activeStudents.length === 0
                ? <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Faol o'quvchilar topilmadi</p>
                : activeStudents
                    .filter((s) => !bulkCourseId || s.courseId === bulkCourseId)
                    .map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: '0.85rem' }}>{s.firstName} {s.lastName}</span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {STATUS_OPTS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setStudentStatus((prev) => ({ ...prev, [s.id]: opt.key }))}
                          style={{
                            padding: '0.25rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${opt.color}44`,
                            background: studentStatus[s.id] === opt.key ? opt.color : 'transparent',
                            color: studentStatus[s.id] === opt.key ? '#fff' : opt.color,
                            transition: 'all 0.15s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setBulkModal(false)}>Bekor</button>
              <button className="btn-primary" onClick={handleBulkSave} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
