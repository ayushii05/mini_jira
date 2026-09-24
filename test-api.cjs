const http = require('http');

function req(path, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }
    const request = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function runTests() {
  console.log('--- Starting API & RBAC Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(cond, name, detail) {
    if (cond) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`, detail || '');
      failed++;
    }
  }

  // 1. Health check
  const health = await req('/api/health');
  assert(health.status === 200 && health.body.ok === true, 'GET /api/health');

  // 2. Missing user header returns 401
  const noUser = await req('/api/users');
  assert(noUser.status === 401, 'Missing x-user-id header returns 401', noUser);

  // 3. Invalid user header returns 401
  const badUser = await req('/api/users', { headers: { 'x-user-id': '99999' } });
  assert(badUser.status === 401, 'Unknown user id returns 401', badUser);

  // 4. Fetch users as Admin (user 1)
  const usersRes = await req('/api/users', { headers: { 'x-user-id': '1' } });
  assert(usersRes.status === 200 && Array.isArray(usersRes.body) && usersRes.body.length >= 5, 'GET /api/users with Admin header');

  const admin = usersRes.body.find(u => u.role === 'Admin');
  const developer = usersRes.body.find(u => u.role === 'Developer');
  const tester = usersRes.body.find(u => u.role === 'Tester');

  // 5. RBAC Rule 1: Only Admins can update a user's role via PATCH /api/users/:id/role
  // 5a. Developer attempts to change role -> 403 Forbidden
  const devChangeRole = await req(`/api/users/${tester.id}/role`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(developer.id) },
    body: { role: 'Developer' },
  });
  assert(devChangeRole.status === 403, 'RBAC Rule 1: Developer cannot update user role (403)', devChangeRole);

  // 5b. Tester attempts to change role -> 403 Forbidden
  const testerChangeRole = await req(`/api/users/${developer.id}/role`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(tester.id) },
    body: { role: 'Admin' },
  });
  assert(testerChangeRole.status === 403, 'RBAC Rule 1: Tester cannot update user role (403)', testerChangeRole);

  // 5c. Admin updates role -> 200 OK
  const adminChangeRole = await req(`/api/users/${tester.id}/role`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(admin.id) },
    body: { role: 'Tester' },
  });
  assert(adminChangeRole.status === 200 && adminChangeRole.body.role === 'Tester', 'RBAC Rule 1: Admin can update user role (200)');

  // 6. RBAC Rule 2: Only Testers can create new tickets via POST /api/tickets
  // 6a. Admin attempts to create ticket -> 403 Forbidden
  const adminCreateTicket = await req('/api/tickets', {
    method: 'POST',
    headers: { 'x-user-id': String(admin.id) },
    body: { title: 'Admin Ticket', description: 'Should fail' },
  });
  assert(adminCreateTicket.status === 403, 'RBAC Rule 2: Admin cannot create ticket (403)', adminCreateTicket);

  // 6b. Developer attempts to create ticket -> 403 Forbidden
  const devCreateTicket = await req('/api/tickets', {
    method: 'POST',
    headers: { 'x-user-id': String(developer.id) },
    body: { title: 'Dev Ticket', description: 'Should fail' },
  });
  assert(devCreateTicket.status === 403, 'RBAC Rule 2: Developer cannot create ticket (403)', devCreateTicket);

  // 6c. Tester creates ticket with client/server validation
  const testerCreateInvalid = await req('/api/tickets', {
    method: 'POST',
    headers: { 'x-user-id': String(tester.id) },
    body: { title: 'ab', description: '' },
  });
  assert(testerCreateInvalid.status === 400, 'Ticket creation validation on short title / empty description', testerCreateInvalid);

  const testerCreateValid = await req('/api/tickets', {
    method: 'POST',
    headers: { 'x-user-id': String(tester.id) },
    body: {
      title: 'Valid Bug from Tester',
      description: 'Detailed steps to reproduce the issue...',
      type: 'Bug',
      priority: 'High',
      assignee_id: developer.id,
    },
  });
  assert(testerCreateValid.status === 201 && testerCreateValid.body.title === 'Valid Bug from Tester', 'RBAC Rule 2: Tester creates ticket (201)', testerCreateValid);
  const createdTicket = testerCreateValid.body;

  // 7. RBAC Rule 3: Only Developers can update ticket status via PATCH /api/tickets/:id/status
  // 7a. Admin attempts to update status -> 403 Forbidden
  const adminUpdateStatus = await req(`/api/tickets/${createdTicket.id}/status`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(admin.id) },
    body: { status: 'In Progress' },
  });
  assert(adminUpdateStatus.status === 403, 'RBAC Rule 3: Admin cannot update ticket status (403)', adminUpdateStatus);

  // 7b. Tester attempts to update status -> 403 Forbidden
  const testerUpdateStatus = await req(`/api/tickets/${createdTicket.id}/status`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(tester.id) },
    body: { status: 'In Progress' },
  });
  assert(testerUpdateStatus.status === 403, 'RBAC Rule 3: Tester cannot update ticket status (403)', testerUpdateStatus);

  // 7c. Developer updates status -> 200 OK
  const devUpdateStatus = await req(`/api/tickets/${createdTicket.id}/status`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(developer.id) },
    body: { status: 'In Progress' },
  });
  assert(devUpdateStatus.status === 200 && devUpdateStatus.body.status === 'In Progress', 'RBAC Rule 3: Developer can update status to In Progress (200)');

  const devUpdateStatusDone = await req(`/api/tickets/${createdTicket.id}/status`, {
    method: 'PATCH',
    headers: { 'x-user-id': String(developer.id) },
    body: { status: 'Done' },
  });
  assert(devUpdateStatusDone.status === 200 && devUpdateStatusDone.body.status === 'Done', 'RBAC Rule 3: Developer can update status to Done (200)');

  // 8. GET /api/tickets: Pagination, Status Filtering, and Search by Title & ID
  // 8a. Pagination (limit, offset)
  const page1 = await req('/api/tickets?limit=3&offset=0', { headers: { 'x-user-id': String(admin.id) } });
  assert(page1.status === 200 && page1.body.tickets.length === 3 && page1.body.limit === 3 && page1.body.offset === 0, 'GET /api/tickets pagination limit=3, offset=0');

  const page2 = await req('/api/tickets?limit=3&offset=3', { headers: { 'x-user-id': String(admin.id) } });
  assert(page2.status === 200 && page2.body.tickets.length === 3 && page2.body.offset === 3, 'GET /api/tickets pagination limit=3, offset=3');

  // 8b. Status filtering
  const doneTickets = await req('/api/tickets?status=Done', { headers: { 'x-user-id': String(admin.id) } });
  assert(doneTickets.status === 200 && doneTickets.body.tickets.every(t => t.status === 'Done'), 'GET /api/tickets?status=Done filters correctly');

  // 8c. Search by Title
  const searchTitle = await req('/api/tickets?q=Valid%20Bug', { headers: { 'x-user-id': String(admin.id) } });
  assert(searchTitle.status === 200 && searchTitle.body.tickets.some(t => t.title.includes('Valid Bug')), 'GET /api/tickets?q=Title matches ticket');

  // 8d. Search by numeric ID
  const searchId = await req(`/api/tickets?q=${createdTicket.id}`, { headers: { 'x-user-id': String(admin.id) } });
  assert(searchId.status === 200 && searchId.body.tickets.some(t => t.id === createdTicket.id), 'GET /api/tickets?q=ID matches numeric ticket ID');

  // 8e. Also test ?search= param
  const searchAlias = await req(`/api/tickets?search=${createdTicket.id}`, { headers: { 'x-user-id': String(admin.id) } });
  assert(searchAlias.status === 200 && searchAlias.body.tickets.some(t => t.id === createdTicket.id), 'GET /api/tickets?search=ID alias works');

  // 9. Stats endpoint for Recharts Pie Chart live data
  const statsRes = await req('/api/tickets/stats', { headers: { 'x-user-id': String(admin.id) } });
  assert(statsRes.status === 200 && typeof statsRes.body.open === 'number' && typeof statsRes.body.closed === 'number', 'GET /api/tickets/stats returns open/closed metrics');

  // 10. Single Unified Deployment: Static assets served from public/ on root /
  const staticRoot = await req('/');
  assert(staticRoot.status === 200 && typeof staticRoot.body === 'string' && staticRoot.body.includes('<!doctype html>'), 'Unified Deployment: GET / serves frontend index.html from public/');

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
