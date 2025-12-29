import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./styles.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!session) return <LoginPage />;
  return <DashboardLayout session={session} />;
}

// --- HALAMAN LOGIN ---
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert("Gagal: " + error.message);
    setLoading(false);
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: "100%",
          maxWidth: "350px",
        }}
      >
        <h1 style={{ color: "#1e3c72", marginBottom: "5px" }}>🔐 Login Guru</h1>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
          Sistem Rekap Nilai SD
        </p>
        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? "Loading..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- DASHBOARD UTAMA DENGAN NAVIGASI TAB ---
function DashboardLayout({ session }) {
  const [activeTab, setActiveTab] = useState("home"); // home, students, grades, attendance
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);

  // Fetch Data Sekali di Induk
  useEffect(() => {
    fetchStudents();
    fetchGrades();
  }, []);

  async function fetchStudents() {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("name", { ascending: true });
    setStudents(data || []);
  }
  async function fetchGrades() {
    const { data } = await supabase
      .from("grades")
      .select("*, students(name, class_name)")
      .order("id", { ascending: false });
    setGrades(data || []);
  }

  const handleLogout = async () => await supabase.auth.signOut();

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        minHeight: "100vh",
        background: "#f8f9fa",
      }}
    >
      {/* 1. TOP NAVBAR */}
      <nav
        style={{
          background: "#fff",
          padding: "15px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>🏫</span>
          <div>
            <h3 style={{ margin: 0, color: "#1e3c72" }}>
              Sistem Sekolah Digital
            </h3>
            <span style={{ fontSize: "12px", color: "#888" }}>
              {session.user.email}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} style={btnOutline}>
          Keluar 🚪
        </button>
      </nav>

      <div
        style={{ maxWidth: "1100px", margin: "30px auto", padding: "0 20px" }}
      >
        {/* 2. MENU TAB NAVIGASI */}
        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <TabButton
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
            icon="🏠"
            label="Dashboard"
          />
          <TabButton
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
            icon="👥"
            label="Siswa"
          />
          <TabButton
            active={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            icon="📅"
            label="Absensi Harian"
          />
          <TabButton
            active={activeTab === "grades"}
            onClick={() => setActiveTab("grades")}
            icon="📝"
            label="Nilai"
          />
        </div>

        {/* 3. KONTEN BERUBAH SESUAI TAB */}
        {activeTab === "home" && (
          <HomeTab students={students} grades={grades} setTab={setActiveTab} />
        )}
        {activeTab === "students" && (
          <StudentsTab
            students={students}
            refresh={fetchStudents}
            refreshGrades={fetchGrades}
            grades={grades}
          />
        )}
        {activeTab === "attendance" && <AttendanceTab students={students} />}
        {activeTab === "grades" && (
          <GradesTab
            students={students}
            grades={grades}
            refresh={fetchGrades}
          />
        )}
      </div>
    </div>
  );
}

// --- KOMPONEN: TAB BUTTON ---
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: "150px",
        padding: "15px",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        background: active
          ? "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
          : "white",
        color: active ? "white" : "#555",
        boxShadow: active
          ? "0 5px 15px rgba(30,60,114,0.3)"
          : "0 2px 5px rgba(0,0,0,0.05)",
        fontWeight: "bold",
        fontSize: "15px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: "0.3s",
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

// --- KONTEN TAB: DASHBOARD HOME ---
function HomeTab({ students, grades, setTab }) {
  const totalStudents = students.length;
  const totalGrades = grades.length;
  const needGuidance = grades.filter(
    (g) => g.rubric === "Perlu Bimbingan"
  ).length;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div style={widgetCard}>
          <div style={{ fontSize: "40px" }}>👨‍🎓</div>
          <div>
            <div
              style={{ fontSize: "28px", fontWeight: "bold", color: "#333" }}
            >
              {totalStudents}
            </div>
            <div style={{ color: "#888", fontSize: "14px" }}>Siswa Aktif</div>
          </div>
        </div>
        <div style={widgetCard}>
          <div style={{ fontSize: "40px" }}>📊</div>
          <div>
            <div
              style={{ fontSize: "28px", fontWeight: "bold", color: "#333" }}
            >
              {totalGrades}
            </div>
            <div style={{ color: "#888", fontSize: "14px" }}>Data Nilai</div>
          </div>
        </div>
        <div style={widgetCard}>
          <div style={{ fontSize: "40px" }}>🚩</div>
          <div>
            <div
              style={{ fontSize: "28px", fontWeight: "bold", color: "#d32f2f" }}
            >
              {needGuidance}
            </div>
            <div style={{ color: "#888", fontSize: "14px" }}>
              Perlu Bimbingan
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          textAlign: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h3>👋 Selamat Datang!</h3>
        <p style={{ color: "#666" }}>
          Jangan lupa isi Absensi hari ini sebelum memulai pelajaran.
        </p>
        <button
          onClick={() => setTab("attendance")}
          style={{ ...btnPrimary, width: "auto", padding: "10px 30px" }}
        >
          Buka Absensi →
        </button>
      </div>
    </div>
  );
}

// --- FITUR: TAB ABSENSI HARIAN (DENGAN "ISI SEMUA HADIR" & REKAP) ---
function AttendanceTab({ students }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [monthlyStats, setMonthlyStats] = useState({}); // State untuk rekap bulanan
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendance();
    fetchMonthlyStats(); // Ambil rekap bulanan juga
  }, [date]);

  async function fetchAttendance() {
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("date", date);
    const map = {};
    if (data) data.forEach((item) => (map[item.student_id] = item.status));
    setAttendanceMap(map);
    setLoading(false);
  }

  // LOGIC BARU: Hitung Sakit/Izin/Alpha bulan ini untuk setiap siswa
  async function fetchMonthlyStats() {
    // Tentukan awal dan akhir bulan dari tanggal yang dipilih
    const selectedDate = new Date(date);
    const startOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];
    const endOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("student_id, status")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    const stats = {};
    if (data) {
      data.forEach((item) => {
        if (!stats[item.student_id])
          stats[item.student_id] = { S: 0, I: 0, A: 0 };
        if (item.status === "Sakit") stats[item.student_id].S++;
        if (item.status === "Izin") stats[item.student_id].I++;
        if (item.status === "Alpha") stats[item.student_id].A++;
      });
    }
    setMonthlyStats(stats);
  }

  async function markAttendance(studentId, status) {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
    await supabase
      .from("attendance")
      .upsert(
        { student_id: studentId, date: date, status: status },
        { onConflict: "student_id, date" }
      );
    fetchMonthlyStats(); // Refresh rekap jika ada perubahan
  }

  // FITUR BARU: TOMBOL "SEMUA HADIR"
  async function markAllPresent() {
    if (!window.confirm("Tandai semua siswa sebagai 'Hadir' untuk hari ini?"))
      return;

    const updates = students.map((s) => ({
      student_id: s.id,
      date: date,
      status: "Hadir",
    }));

    // Optimistic UI Update
    const newMap = { ...attendanceMap };
    students.forEach((s) => (newMap[s.id] = "Hadir"));
    setAttendanceMap(newMap);

    // Bulk Upsert ke Supabase
    const { error } = await supabase
      .from("attendance")
      .upsert(updates, { onConflict: "student_id, date" });
    if (error) alert("Gagal update massal");
  }

  // Ringkasan Harian
  const summary = {
    Hadir: Object.values(attendanceMap).filter((s) => s === "Hadir").length,
    Sakit: Object.values(attendanceMap).filter((s) => s === "Sakit").length,
    Izin: Object.values(attendanceMap).filter((s) => s === "Izin").length,
    Alpha: Object.values(attendanceMap).filter((s) => s === "Alpha").length,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "25px",
        alignItems: "start",
      }}
    >
      {/* KOLOM KIRI */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #eee",
            paddingBottom: "15px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#1e3c72" }}>📅 Absensi Harian</h3>
            <p style={{ margin: "5px 0 0", color: "#666", fontSize: "13px" }}>
              Status Bulan:{" "}
              {new Date(date).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #1e3c72",
              }}
            />
            {/* TOMBOL ISI SEMUA */}
            <button
              onClick={markAllPresent}
              style={{
                background: "#e3f2fd",
                color: "#1565c0",
                border: "1px solid #1565c0",
                borderRadius: "6px",
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              ✅ Isi Semua Hadir
            </button>
          </div>
        </div>

        {loading ? (
          <p>Memuat...</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {students.map((s) => {
              const status = attendanceMap[s.id];
              // Ambil data rekap bulanan (S/I/A)
              const stat = monthlyStats[s.id] || { S: 0, I: 0, A: 0 };

              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 15px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    borderLeft:
                      status === "Alpha"
                        ? "4px solid red"
                        : "4px solid transparent",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", color: "#333" }}>
                      {s.name}
                    </div>
                    {/* INFO REKAP BULANAN DI BAWAH NAMA */}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#888",
                        marginTop: "2px",
                      }}
                    >
                      Bulan ini:
                      <span style={{ color: "#ff9800", marginLeft: "5px" }}>
                        Sakit: {stat.S}
                      </span>{" "}
                      |
                      <span style={{ color: "#2196f3", marginLeft: "5px" }}>
                        Izin: {stat.I}
                      </span>{" "}
                      |
                      <span style={{ color: "#f44336", marginLeft: "5px" }}>
                        Alpha: {stat.A}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "5px" }}>
                    <AbsenBtn
                      label="H"
                      color="#4caf50"
                      active={status === "Hadir"}
                      onClick={() => markAttendance(s.id, "Hadir")}
                      title="Hadir"
                    />
                    <AbsenBtn
                      label="S"
                      color="#ff9800"
                      active={status === "Sakit"}
                      onClick={() => markAttendance(s.id, "Sakit")}
                      title="Sakit"
                    />
                    <AbsenBtn
                      label="I"
                      color="#2196f3"
                      active={status === "Izin"}
                      onClick={() => markAttendance(s.id, "Izin")}
                      title="Izin"
                    />
                    <AbsenBtn
                      label="A"
                      color="#f44336"
                      active={status === "Alpha"}
                      onClick={() => markAttendance(s.id, "Alpha")}
                      title="Alpha"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KOLOM KANAN: RINGKASAN */}
      <div style={{ ...cardStyle, position: "sticky", top: "20px" }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>📊 Status Hari Ini</h3>
        <div style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
          {new Date(date).toLocaleDateString("id-ID", { dateStyle: "full" })}
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          <StatRow
            label="Hadir"
            count={summary.Hadir}
            color="#4caf50"
            icon="✅"
          />
          <StatRow
            label="Sakit"
            count={summary.Sakit}
            color="#ff9800"
            icon="🤒"
          />
          <StatRow
            label="Izin"
            count={summary.Izin}
            color="#2196f3"
            icon="📩"
          />
          <StatRow
            label="Alpha"
            count={summary.Alpha}
            color="#f44336"
            icon="❌"
          />
        </div>
        <div
          style={{
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
            textAlign: "center",
            fontSize: "12px",
            color: "#888",
          }}
        >
          Total: {students.length} Siswa
        </div>
      </div>
    </div>
  );
}

// Komponen Kecil Tombol Absen
function AbsenBtn({ label, color, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "35px",
        height: "35px",
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        fontWeight: "bold",
        background: active ? color : "#e0e0e0", // Kalau aktif warna warni, kalau tidak abu-abu
        color: active ? "white" : "#777",
        transform: active ? "scale(1.1)" : "scale(1)",
        boxShadow: active ? `0 2px 8px ${color}80` : "none",
        transition: "0.2s",
      }}
    >
      {label}
    </button>
  );
}

function StatRow({ label, count, color, icon }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px",
        background: `${color}15`,
        borderRadius: "6px",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>{icon}</span>{" "}
        <span style={{ fontWeight: "600", color: "#444" }}>{label}</span>
      </div>
      <strong style={{ fontSize: "18px", color: color }}>{count}</strong>
    </div>
  );
}

// --- KONTEN TAB 2: BIODATA SISWA LENGKAP ---
function StudentsTab({ students, refresh, refreshGrades, grades }) {
  // State Form Biodata
  const [form, setForm] = useState({
    name: "",
    class_name: "",
    nisn: "",
    birth_place: "",
    birth_date: "",
    address: "",
    parent_name: "",
    photo_url: "",
  });

  const [editingId, setEditingId] = useState(null); // Mode Edit
  const [showModal, setShowModal] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  // Handle Perubahan Input
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Handle Simpan / Update
  async function handleSave(e) {
    e.preventDefault();
    if (!form.name) return alert("Nama wajib diisi!");

    const payload = {
      name: form.name,
      class_name: form.class_name,
      nisn: form.nisn,
      birth_place: form.birth_place,
      birth_date: form.birth_date || null, // Handle jika kosong
      address: form.address,
      parent_name: form.parent_name,
      photo_url: form.photo_url,
    };

    if (editingId) {
      // Update Data Lama
      await supabase.from("students").update(payload).eq("id", editingId);
      setEditingId(null);
    } else {
      // Insert Data Baru
      await supabase.from("students").insert([payload]);
    }

    // Reset Form
    setForm({
      name: "",
      class_name: "",
      nisn: "",
      birth_place: "",
      birth_date: "",
      address: "",
      parent_name: "",
      photo_url: "",
    });
    refresh();
  }

  // Masuk Mode Edit
  function handleEdit(student) {
    setEditingId(student.id);
    setForm({
      name: student.name,
      class_name: student.class_name,
      nisn: student.nisn || "",
      birth_place: student.birth_place || "",
      birth_date: student.birth_date || "",
      address: student.address || "",
      parent_name: student.parent_name || "",
      photo_url: student.photo_url || "",
    });
    // Scroll ke atas form
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      class_name: "",
      nisn: "",
      birth_place: "",
      birth_date: "",
      address: "",
      parent_name: "",
      photo_url: "",
    });
  }

  async function deleteStudent(id, sName) {
    if (!window.confirm(`Hapus data siswa: ${sName}?`)) return;
    await supabase.from("grades").delete().eq("student_id", id);
    await supabase.from("attendance").delete().eq("student_id", id);
    await supabase.from("students").delete().eq("id", id);
    refresh();
    refreshGrades();
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "25px",
        alignItems: "start",
      }}
    >
      {/* BAGIAN KIRI: FORMULIR BIODATA */}
      <div
        style={{
          ...cardStyle,
          borderTop: editingId ? "4px solid #f57c00" : "4px solid #1e3c72",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#1e3c72" }}>
          {editingId ? "✏️ Edit Biodata Siswa" : "👤 Input Biodata Siswa"}
        </h3>

        <form onSubmit={handleSave} style={{ display: "grid", gap: "12px" }}>
          {/* Baris 1: Nama & Kelas */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
              >
                Nama Lengkap *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label
                style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
              >
                Kelas *
              </label>
              <input
                type="text"
                name="class_name"
                value={form.class_name}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Baris 2: NISN & Nama Wali */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
              >
                NISN
              </label>
              <input
                type="text"
                name="nisn"
                value={form.nisn}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
              >
                Nama Wali Murid
              </label>
              <input
                type="text"
                name="parent_name"
                value={form.parent_name}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Baris 3: TTL */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
              >
                Tempat Lahir
              </label>
              <input
                type="text"
                name="birth_place"
                value={form.birth_place}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
              >
                Tanggal Lahir
              </label>
              <input
                type="date"
                name="birth_date"
                value={form.birth_date}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Baris 4: Foto & Alamat */}
          <div>
            <label
              style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
            >
              Link Foto (URL)
            </label>
            <input
              type="url"
              name="photo_url"
              placeholder="https://..."
              value={form.photo_url}
              onChange={handleChange}
              style={inputStyle}
            />
            <small style={{ color: "#888", fontSize: "11px" }}>
              *Tempel link gambar dari Google Drive/ImgBB (Opsional)
            </small>
          </div>

          <div>
            <label
              style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}
            >
              Alamat Rumah
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              style={{ ...inputStyle, minHeight: "60px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button type="submit" style={editingId ? btnWarning : btnPrimary}>
              {editingId ? "Update Biodata" : "Simpan Siswa"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} style={btnOutline}>
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* BAGIAN KANAN: DAFTAR KARTU SISWA */}
      <div style={{ ...cardStyle, background: "#f8f9fa" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 style={{ margin: 0, color: "#1e3c72" }}>
            🗂️ Data Siswa ({students.length})
          </h3>
        </div>

        <div
          style={{
            maxHeight: "75vh",
            overflowY: "auto",
            display: "grid",
            gap: "15px",
          }}
        >
          {students.map((s) => (
            <div
              key={s.id}
              style={{
                background: "white",
                padding: "15px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                display: "flex",
                gap: "15px",
                alignItems: "start",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              }}
            >
              {/* FOTO SISWA */}
              <div
                style={{
                  width: "60px",
                  height: "75px",
                  background: "#eee",
                  borderRadius: "6px",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {s.photo_url ? (
                  <img
                    src={s.photo_url}
                    alt={s.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "#aaa",
                      fontSize: "24px",
                    }}
                  >
                    👤
                  </div>
                )}
              </div>

              {/* INFO BIODATA */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    marginBottom: "5px",
                  }}
                >
                  Kelas {s.class_name} | NISN: {s.nisn || "-"}
                </div>

                <div
                  style={{ fontSize: "11px", color: "#666", lineHeight: "1.4" }}
                >
                  <div>
                    🎂 {s.birth_place}, {s.birth_date}
                  </div>
                  <div>🏠 {s.address}</div>
                  <div>👨‍👩‍👧 Wali: {s.parent_name}</div>
                </div>

                {/* TOMBOL AKSI */}
                <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      setActiveStudent(s);
                      setShowModal(true);
                    }}
                    style={{
                      ...btnIconBlue,
                      fontSize: "11px",
                      padding: "5px 10px",
                    }}
                  >
                    📄 Rapor
                  </button>
                  <button
                    onClick={() => handleEdit(s)}
                    style={{
                      ...btnIconBlue,
                      background: "#fff3e0",
                      color: "#f57c00",
                      fontSize: "11px",
                      padding: "5px 10px",
                    }}
                  >
                    ✎ Edit
                  </button>
                  <button
                    onClick={() => deleteStudent(s.id, s.name)}
                    style={{
                      ...btnIconRed,
                      fontSize: "11px",
                      padding: "5px 10px",
                    }}
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <p style={{ textAlign: "center", color: "#999" }}>
              Belum ada data siswa.
            </p>
          )}
        </div>
      </div>

      {showModal && activeStudent && (
        <StudentReportModal
          student={activeStudent}
          allGrades={grades}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// --- KONTEN TAB 3: NILAI (SUPPORT MULTI-PORTOFOLIO) ---
function GradesTab({ students, grades, refresh }) {
  const [form, setForm] = useState({
    studentId: "",
    semester: "Kelas 1 - Ganjil",
    subject: "",
    score: "",
    rubric: "Cakap",
    reflection: "",
    url: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState({ sem: "Semua", sub: "Semua" });
  const semOpts = [
    "Kelas 1 - Ganjil",
    "Kelas 1 - Genap",
    "Kelas 2 - Ganjil",
    "Kelas 2 - Genap",
    "Kelas 3 - Ganjil",
    "Kelas 3 - Genap",
    "Kelas 4 - Ganjil",
    "Kelas 4 - Genap",
    "Kelas 5 - Ganjil",
    "Kelas 5 - Genap",
    "Kelas 6 - Ganjil",
    "Kelas 6 - Genap",
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentId) return alert("Pilih Siswa!");
    const payload = {
      student_id: form.studentId,
      semester: form.semester,
      subject: form.subject,
      score: parseInt(form.score),
      rubric: form.rubric,
      reflection: form.reflection,
      portfolio_url: form.url,
    };

    if (editingId) {
      await supabase.from("grades").update(payload).eq("id", editingId);
      setEditingId(null);
    } else {
      await supabase.from("grades").insert([payload]);
    }
    refresh();
    setForm({ ...form, score: "", reflection: "", url: "" });
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.text(`Rekap Nilai - ${filter.sem}`, 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Nama", "Kelas/Smt", "Mapel", "Nilai", "Predikat"]],
      body: filtered.map((g) => [
        g.students?.name,
        g.semester,
        g.subject,
        g.score,
        g.rubric,
      ]),
    });
    doc.save("Rekap_Nilai.pdf");
  }

  function handleEdit(g) {
    setEditingId(g.id);
    setForm({
      studentId: g.student_id,
      semester: g.semester,
      subject: g.subject,
      score: g.score,
      rubric: g.rubric,
      reflection: g.reflection || "",
      url: g.portfolio_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // HELPER: Fungsi untuk memecah teks menjadi banyak link
  function renderMultiLinks(urlText) {
    if (!urlText) return null;
    // Pisahkan berdasarkan koma (,) atau spasi atau baris baru
    const urls = urlText.split(/[\s,]+/).filter((u) => u.length > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {urls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "11px",
              color: "#1e3c72",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            🔗 Link {i + 1}
          </a>
        ))}
      </div>
    );
  }

  const filtered = grades.filter(
    (g) =>
      (filter.sem === "Semua" || g.semester === filter.sem) &&
      (filter.sub === "Semua" ||
        g.subject.toLowerCase().includes(filter.sub.toLowerCase()))
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: "25px",
        alignItems: "start",
      }}
    >
      {/* FORM INPUT */}
      <div
        style={{
          ...cardStyle,
          borderTop: editingId ? "4px solid #f57c00" : "4px solid #1e3c72",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {editingId ? "✏️ Edit Nilai" : "📝 Input Nilai"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <select
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            style={inputStyle}
            required
          >
            <option value="">-- Pilih Siswa --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            style={inputStyle}
          >
            {semOpts.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Mapel"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              style={inputStyle}
              required
            />
            <input
              type="number"
              placeholder="Nilai"
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <select
            value={form.rubric}
            onChange={(e) => setForm({ ...form, rubric: e.target.value })}
            style={inputStyle}
          >
            <option>Sangat Mahir</option>
            <option>Mahir</option>
            <option>Cakap</option>
            <option>Perlu Bimbingan</option>
          </select>

          {/* UBAH INPUT URL JADI TEXTAREA AGAR BISA PASTE BANYAK LINK */}
          <div>
            <textarea
              placeholder="🔗 Link Portofolio (Pisahkan dengan koma atau spasi jika > 1)"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              style={{ ...inputStyle, minHeight: "60px", fontSize: "12px" }}
            />
          </div>

          <textarea
            placeholder="Refleksi..."
            value={form.reflection}
            onChange={(e) => setForm({ ...form, reflection: e.target.value })}
            style={{ ...inputStyle, minHeight: "60px" }}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" style={editingId ? btnWarning : btnSuccess}>
              {editingId ? "Update" : "Simpan"}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...form, score: "" });
                }}
                style={btnOutline}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABEL DATA */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "15px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <select
            onChange={(e) => setFilter({ ...filter, sem: e.target.value })}
            style={inputStyle}
          >
            <option value="Semua">Semua Semester</option>
            {semOpts.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button onClick={exportPDF} style={btnBlack}>
            🖨️ PDF
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f4f4f4",
                  textAlign: "left",
                  color: "#666",
                }}
              >
                <th style={{ padding: "10px" }}>Siswa</th>
                <th style={{ padding: "10px" }}>Mapel</th>
                <th style={{ padding: "10px" }}>Nilai</th>
                <th style={{ padding: "10px" }}>Portofolio</th>
                <th style={{ padding: "10px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr
                  key={g.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    background: editingId === g.id ? "#fff8e1" : "white",
                  }}
                >
                  <td style={{ padding: "10px" }}>
                    <strong>{g.students?.name}</strong>
                    <br />
                    <small style={{ color: "#888" }}>{g.semester}</small>
                  </td>
                  <td style={{ padding: "10px" }}>{g.subject}</td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontWeight: "bold" }}>{g.score}</div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: g.rubric === "Perlu Bimbingan" ? "red" : "green",
                      }}
                    >
                      {g.rubric}
                    </div>
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    {/* TAMPILKAN BANYAK LINK */}
                    {renderMultiLinks(g.portfolio_url)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button onClick={() => handleEdit(g)} style={btnIconBlue}>
                      ✎
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- KOMPONEN MODAL RAPOR (DENGAN OPSI PILIH SEMESTER) ---
function StudentReportModal({ student, allGrades, onClose }) {
  const [attendanceStats, setAttendanceStats] = useState({
    S: 0,
    I: 0,
    A: 0,
    H: 0,
  });
  const [loadingAbsence, setLoadingAbsence] = useState(true);

  // STATE BARU: Pilihan Semester untuk Cetak
  const [printFilter, setPrintFilter] = useState("Semua");

  const studentGrades = allGrades.filter((g) => g.student_id === student.id);
  const grouped = {};
  studentGrades.forEach((g) => {
    if (!grouped[g.semester]) grouped[g.semester] = [];
    grouped[g.semester].push(g);
  });

  // Ambil daftar semester yang tersedia untuk dropdown
  const availableSemesters = Object.keys(grouped);

  useEffect(() => {
    async function fetchAttendanceStats() {
      setLoadingAbsence(true);
      const { data, error } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", student.id);
      if (!error && data) {
        const stats = { S: 0, I: 0, A: 0, H: 0 };
        data.forEach((row) => {
          if (row.status === "Sakit") stats.S++;
          if (row.status === "Izin") stats.I++;
          if (row.status === "Alpha") stats.A++;
          if (row.status === "Hadir") stats.H++;
        });
        setAttendanceStats(stats);
      }
      setLoadingAbsence(false);
    }
    fetchAttendanceStats();
  }, [student.id]);

  function renderLinksHTML(urlText) {
    if (!urlText) return "-";
    const urls = urlText.split(/[\s,]+/).filter((u) => u.length > 0);
    return urls.map((u, i) => (
      <a
        key={i}
        href={u}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          marginRight: "5px",
          color: "#1e3c72",
          fontSize: "11px",
          textDecoration: "underline",
        }}
      >
        [Link {i + 1}]
      </a>
    ));
  }

  function printIndividualPDF() {
    const doc = new jsPDF();

    // HEADER
    doc.setFontSize(16);
    doc.setTextColor(30, 60, 114);
    const titleSuffix =
      printFilter === "Semua" ? "" : ` - ${printFilter.toUpperCase()}`;
    doc.text(
      `LAPORAN HASIL BELAJAR${titleSuffix}`,
      105,
      20,
      null,
      null,
      "center"
    );

    // BIODATA
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const startY = 35;
    doc.text(`Nama: ${student.name}`, 14, startY);
    doc.text(
      `TTL: ${student.birth_place || "-"}, ${student.birth_date || "-"}`,
      110,
      startY
    );
    doc.text(`NISN: ${student.nisn || "-"}`, 14, startY + 6);
    doc.text(`Wali: ${student.parent_name || "-"}`, 110, startY + 6);
    doc.text(`Kelas: ${student.class_name}`, 14, startY + 12);
    doc.text(`Alamat: ${student.address || "-"}`, 110, startY + 12);
    doc.setLineWidth(0.5);
    doc.line(14, startY + 18, 196, startY + 18);

    let finalY = startY + 25;

    // --- LOGIKA FILTER SEMESTER ---
    // Jika "Semua", ambil semua key. Jika spesifik, ambil array berisi 1 key saja.
    const semestersToPrint =
      printFilter === "Semua" ? Object.keys(grouped) : [printFilter];

    semestersToPrint.forEach((smt) => {
      // Cek apakah data semester tersebut ada (jaga-jaga error)
      if (!grouped[smt]) return;

      doc.setFillColor(240, 240, 240);
      doc.rect(14, finalY, 182, 8, "F");
      doc.setFontSize(11);
      doc.setTextColor(30, 60, 114);
      doc.text(smt, 16, finalY + 5.5);

      const rows = grouped[smt].map((g) => {
        let linkText = "-";
        if (g.portfolio_url) {
          const count = g.portfolio_url.split(/[\s,]+/).filter((u) => u).length;
          linkText = count > 0 ? `${count} Link Terlampir` : "-";
        }
        return [g.subject, g.score, g.rubric, g.reflection || "-", linkText];
      });

      autoTable(doc, {
        startY: finalY + 10,
        head: [
          ["Mata Pelajaran", "Nilai", "Predikat", "Catatan", "Portofolio"],
        ],
        body: rows,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3 },
      });
      finalY = doc.lastAutoTable.finalY + 10;
    });

    // ABSENSI
    if (finalY > 220) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Keterangan Ketidakhadiran:", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Keterangan", "Jumlah Hari"]],
      body: [
        ["Sakit", `${attendanceStats.S} hari`],
        ["Izin", `${attendanceStats.I} hari`],
        ["Alpha", `${attendanceStats.A} hari`],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40 } },
      tableWidth: 100,
    });
    finalY = doc.lastAutoTable.finalY + 15;

    // TTD
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    doc.setTextColor(0);
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    doc.text(`.................., ${dateStr}`, 140, finalY);
    doc.text("Wali Kelas", 140, finalY + 20);
    doc.text("( ..................................... )", 140, finalY + 45);

    // Nama file disesuaikan dengan semester
    const fileName =
      printFilter === "Semua"
        ? `Rapor_Lengkap_${student.name}.pdf`
        : `Rapor_${printFilter}_${student.name}.pdf`;
    doc.save(fileName);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          width: "90%",
          maxWidth: "700px",
          borderRadius: "12px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8f9fa",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#1e3c72", fontSize: "20px" }}>
              📄 Data Rapor Siswa
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "20px",
            background: "#fff",
          }}
        >
          {/* LAYOUT GRID BIODATA & ABSENSI */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: "#fdfdfd",
                border: "1px solid #eee",
                padding: "15px",
                borderRadius: "8px",
                fontSize: "13px",
                lineHeight: "1.6",
                color: "#444",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  borderBottom: "1px solid #ddd",
                  marginBottom: "5px",
                  paddingBottom: "5px",
                }}
              >
                👤 Biodata
              </div>
              <div>
                <strong>Nama:</strong> {student.name}
              </div>
              <div>
                <strong>NISN:</strong> {student.nisn || "-"}
              </div>
              <div>
                <strong>Kelas:</strong> {student.class_name}
              </div>
            </div>
            <div
              style={{
                background: "#fff8e1",
                border: "1px solid #ffe082",
                padding: "15px",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  borderBottom: "1px solid #faad14",
                  marginBottom: "5px",
                  paddingBottom: "5px",
                  color: "#e65100",
                }}
              >
                📊 Rekap Kehadiran
              </div>
              {loadingAbsence ? (
                <span>Memuat...</span>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "5px",
                  }}
                >
                  <div>
                    🤒 Sakit: <strong>{attendanceStats.S}</strong>
                  </div>{" "}
                  <div>
                    📩 Izin: <strong>{attendanceStats.I}</strong>
                  </div>
                  <div>
                    ❌ Alpha: <strong>{attendanceStats.A}</strong>
                  </div>{" "}
                  <div>
                    ✅ Hadir: <strong>{attendanceStats.H}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TABEL DATA */}
          {Object.keys(grouped).length === 0 ? (
            <p style={{ textAlign: "center", color: "#999" }}>
              Belum ada nilai.
            </p>
          ) : (
            Object.keys(grouped).map((smt) => (
              <div key={smt} style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    background: "#1e3c72",
                    color: "white",
                    padding: "5px 10px",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  {smt}
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #ddd",
                    fontSize: "13px",
                  }}
                >
                  <tbody>
                    {grouped[smt].map((g) => (
                      <tr key={g.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px" }}>
                          <strong>{g.subject}</strong>
                        </td>
                        <td style={{ padding: "8px" }}>{g.score}</td>
                        <td style={{ padding: "8px", color: "#666" }}>
                          {g.reflection}
                        </td>
                        <td style={{ padding: "8px" }}>
                          {renderLinksHTML(g.portfolio_url)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* FOOTER: OPSI CETAK */}
        <div
          style={{
            padding: "15px",
            borderTop: "1px solid #eee",
            background: "#f8f9fa",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <label
            style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}
          >
            Pilih Semester:
          </label>

          {/* DROPDOWN PILIHAN SEMESTER */}
          <select
            value={printFilter}
            onChange={(e) => setPrintFilter(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "13px",
              outline: "none",
            }}
          >
            <option value="Semua">Semua Semester (Lengkap)</option>
            {availableSemesters.map((smt) => (
              <option key={smt} value={smt}>
                {smt}
              </option>
            ))}
          </select>

          <button
            onClick={printIndividualPDF}
            style={{
              background: "#333",
              color: "white",
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🖨️ Cetak PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// --- STYLES OBJECTS ---
const btnPrimary = {
  background: "#1e3c72",
  color: "white",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  width: "100%",
};
const btnSuccess = {
  background: "#2e7d32",
  color: "white",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  width: "100%",
};
const btnWarning = {
  background: "#f57c00",
  color: "white",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  width: "100%",
};
const btnOutline = {
  background: "transparent",
  border: "1px solid #1e3c72",
  color: "#1e3c72",
  padding: "8px 15px",
  borderRadius: "6px",
  cursor: "pointer",
};
const btnBlack = {
  background: "#333",
  color: "white",
  padding: "8px 15px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnIconRed = {
  background: "#ffebee",
  color: "#c62828",
  border: "none",
  borderRadius: "4px",
  padding: "5px 10px",
  cursor: "pointer",
};
const btnIconBlue = {
  background: "#e3f2fd",
  color: "#1565c0",
  border: "none",
  borderRadius: "4px",
  padding: "5px 10px",
  cursor: "pointer",
};
const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const widgetCard = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  display: "flex",
  alignItems: "center",
  gap: "20px",
};
const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  width: "100%",
  boxSizing: "border-box",
};
