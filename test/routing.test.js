/* eslint-env jest */
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app');

// readyState is a prototype getter; override it directly per-test so jest.spyOn's
// own-property lookup does not throw. Restore to the real getter afterwards.
function setReadyState(value) {
  Object.defineProperty(mongoose.connection, 'readyState', {
    get: () => value,
    configurable: true,
  });
}

describe('routing under /api', () => {
  afterEach(() => {
    delete mongoose.connection.readyState;
  });

  it('mounts auth-gated routes under /api (401, not 404)', async () => {
    const res = await request(app).get('/api/vitals');
    expect(res.status).toBe(401);
  });

  it('no longer serves feature routes at the old root path', async () => {
    const res = await request(app).get('/vitals');
    expect(res.status).toBe(404);
  });

  it('reports healthy when the DB is connected', async () => {
    setReadyState(1);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  it('reports degraded (503) when the DB is disconnected', async () => {
    setReadyState(0);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', db: 'disconnected' });
  });
});
