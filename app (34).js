/* ── Nexium ISO App — API Service ── */
const API_BASE = 'https://iso.novahseq.com/api/worker';

const Api = {
  _token: null,
  _user: null,

  init() {
    this._token = localStorage.getItem('nova_token');
    const u = localStorage.getItem('nova_user');
    this._user = u ? JSON.parse(u) : null;
    const co = localStorage.getItem('nova_company');
    this._company = co ? JSON.parse(co) : null;
  },

  getCompany() { return this._company; },

  setCompany(company) {
    this._company = company;
    localStorage.setItem('nova_company', JSON.stringify(company));
  },

  clearCompany() {
    this._company = null;
    localStorage.removeItem('nova_company');
  },

  async getCompanies(query = '') {
    const url = 'https://iso.novahseq.com/api/companies.php' + (query ? '?q=' + encodeURIComponent(query) : '');
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      return data.ok ? data.data : [];
    } catch (e) {
      // Offline mock
      return [
        { id: 1, name: 'Nexium Demo', slug: 'novahseq-demo', ruc: '20601234567', color: '#2563eb', logo: null },
        { id: 2, name: 'Inka Industrial', slug: 'inka-industrial', ruc: '20607654321', color: '#16a34a', logo: null },
      ];
    }
  },

  isLoggedIn() {
    return !!this._token;
  },

  getUser() {
    return this._user;
  },

  _headers() {
    const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (this._token) h['Authorization'] = 'Bearer ' + this._token;
    return h;
  },

  async _req(method, endpoint, body = null) {
    const opts = { method, headers: this._headers() };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(API_BASE + endpoint, opts);
      const data = await res.json();
      if (res.status === 401) {
        this.logout();
        Router.go('login');
        return null;
      }
      return data;
    } catch (e) {
      console.error('API error:', e);
      // Return mock data when offline/API not ready
      return this._mock(method, endpoint);
    }
  },

  async login(email, password) {
    const body = { email, password };
    try {
      // Include company_id if a company was selected
      if (this._company?.id) body.company_id = this._company.id;
      const res = await fetch('https://iso.novahseq.com/api/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.token) {
        this._token = data.token;
        this._user  = data.user;
        localStorage.setItem('nova_token', data.token);
        localStorage.setItem('nova_user', JSON.stringify(data.user));
        return { ok: true, user: data.user };
      }
      return { ok: false, message: data.message || 'Credenciales incorrectas' };
    } catch (e) {
      // Offline mode — demo credentials
      if (email === 'demo@novahseq.com' && password === 'demo123') {
        const demoUser = { id: 1, full_name: 'Juan Carlos Astuvilca', email, job_title: 'Gerente', company_name: 'Nexium Demo', avatar_url: null };
        this._token = 'demo-token-local';
        this._user  = demoUser;
        localStorage.setItem('nova_token', this._token);
        localStorage.setItem('nova_user', JSON.stringify(demoUser));
        return { ok: true, user: demoUser };
      }
      return { ok: false, message: 'Sin conexión al servidor' };
    }
  },

  logout(clearCompany = false) {
    this._token = null;
    this._user  = null;
    localStorage.removeItem('nova_token');
    localStorage.removeItem('nova_user');
    if (clearCompany) this.clearCompany();
  },

  async getDashboard()  { return this._req('GET', '/dashboard.php'); },
  async getTasks()      { return this._req('GET', '/tasks.php'); },
  async updateTask(id, status) { return this._req('POST', '/tasks.php', { action: 'update_status', id, status }); },
  async getIperc()      { return this._req('GET', '/iperc.php'); },
  async submitIncident(data) { return this._req('POST', '/incidents.php', data); },
  async getProfile()    { return this._req('GET', '/profile.php'); },

  // ── Mock data when API isn't ready yet ───────────────────────────────────
  _mock(method, endpoint) {
    const user = this._user || {};
    if (endpoint.includes('dashboard')) return {
      ok: true,
      data: {
        tasks_pending: 4, incidents_reported: 2,
        iperc_count: 12, trainings_done: 3,
        nc_open: 1, signatures_pending: 2,
        company_name: user.company_name || 'Nexium',
        worker_name: user.full_name || 'Trabajador'
      }
    };
    if (endpoint.includes('tasks')) return {
      ok: true,
      data: [
        { id: 1, title: 'Inspección de EPP en almacén norte', description: 'Verificar el estado de los EPPs del turno mañana', due_date: '2026-04-28', priority: 'high', status: 'open', area: 'Almacén', assigned_by: 'Supervisor SST' },
        { id: 2, title: 'Completar capacitación de emergencias', description: 'Módulo 3: Evacuación y primeros auxilios', due_date: '2026-04-30', priority: 'medium', status: 'in_progress', area: 'RRHH', assigned_by: 'Coord. Capacitaciones' },
        { id: 3, title: 'Firma del IPERC de planta principal', description: 'IPERC-2026-001 requiere tu firma de conformidad', due_date: '2026-04-25', priority: 'high', status: 'open', area: 'Planta', assigned_by: 'Jefe SST' },
        { id: 4, title: 'Actualizar datos de contacto de emergencia', description: 'Revisa y actualiza el teléfono de tu contacto', due_date: '2026-05-05', priority: 'low', status: 'open', area: 'RRHH', assigned_by: 'Administración' },
      ]
    };
    if (endpoint.includes('iperc')) return {
      ok: true,
      data: [
        { id: 1, record_code: 'IPERC-2026-001', process_name: 'Operación de montacargas', activity_name: 'Carga y descarga de materiales', area_name: 'Almacén', risk_count: 6, high_risk_count: 2, validity_date: '2026-09-30',
          items: [
            { hazard: 'Caída de objetos desde el montacargas', risk: 'Golpe o aplastamiento del operador', level: 'high', control: 'Uso obligatorio de casco y distancia de seguridad 3m', epp: 'Casco, zapatos de seguridad, chaleco reflectivo' },
            { hazard: 'Vuelco del montacargas en rampa', risk: 'Volcamiento y atrapamiento', level: 'critical', control: 'Velocidad máxima 5 km/h, revisión de frenos antes del turno', epp: 'Arnés de seguridad, casco' },
            { hazard: 'Colisión con peatones', risk: 'Atropellamiento', level: 'high', control: 'Rutas exclusivas señalizadas, bocina en cruces', epp: 'Chaleco reflectivo para peatones' },
          ]
        },
        { id: 2, record_code: 'IPERC-2026-002', process_name: 'Trabajo en altura', activity_name: 'Mantenimiento de techos y estructuras', area_name: 'Planta', risk_count: 4, high_risk_count: 3, validity_date: '2026-10-15',
          items: [
            { hazard: 'Caída de persona desde altura mayor a 1.8m', risk: 'Lesiones graves o muerte', level: 'critical', control: 'PTW obligatorio, línea de vida y arnés certificado', epp: 'Arnés completo, casco, guantes' },
            { hazard: 'Caída de herramientas', risk: 'Golpe a personas en nivel inferior', level: 'high', control: 'Bolsa portaherramientas, cordino de seguridad en herramientas', epp: 'Casco, chaleco' },
          ]
        },
      ]
    };
    return { ok: true, data: {} };
  }
};

window.Api = Api;
