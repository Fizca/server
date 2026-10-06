/* eslint-env jest */
const request = require('supertest');
const { app, start } = require('../app');

describe('app module', () => {
  it('exports app and start without connecting to the DB at import', () => {
    expect(typeof start).toBe('function');
    expect(app).toBeDefined();
  });

  it('trusts the proxy for X-Forwarded-* headers', () => {
    expect(app.enabled('trust proxy')).toBe(true);
  });

  it('serves the LWA liveness route at /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hello: 'world' });
  });

  it('defaults the port to 8080 when PORT is unset', () => {
    // eslint-disable-next-line global-require
    const config = require('config');
    expect(String(config.port)).toBe('8080');
  });
});
