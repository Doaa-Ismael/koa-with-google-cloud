'use strict';

const Koa = require('koa');
const logging = require('@kasa/koa-logging');
const Router = require('koa-router');
const requestId = require('@kasa/koa-request-id');
const bodyParser = require('./middlewares/body-parser');
const cors = require('./middlewares/cors');
const errorHandler = require('./middlewares/error-handler');
const corsConfig = require('./config/cors');
const logger = require('./logger');
const defaultRouter = require('./routes');


class App extends Koa {
  constructor(...params) {
    super(...params);

    // Trust proxy
    this.proxy = true;
    // Disable `console.errors` except development env
    this.silent = this.env !== 'development';

    this.servers = [];

    this._configureMiddlewares();
    this._configureRoutes();
  }

  _configureMiddlewares() {
    this.use(errorHandler());
    this.use(requestId());
    this.use(logging({
      logger,
      overrideSerializers: false
    }));
    this.use(
      bodyParser({
        enableTypes: ['json'],
        jsonLimit: '10mb'
      })
    );
    this.use(
      cors({
        origins: corsConfig.origins,
        allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id']
      })
    );
  }

  _configureRoutes() {
    const newRouter = new Router();
    newRouter.get('/', (ctx) => ctx.body = 'hello from "try-cleaning-stage-on-ci" branch! ');
    newRouter.get('/2', (ctx) => ctx.body = 'hello again!');
    // const globalRouter = new Router();

    // Bootstrap application router
    this.use(newRouter.routes());
    this.use(newRouter.allowedMethods());
    this.use(defaultRouter.routes());
    this.use(defaultRouter.allowedMethods());
  }

  listen(...args) {
    const server = super.listen(...args);
    this.servers.push(server);
    return server;
  }

  async terminate() {
    // TODO: Implement graceful shutdown with pending request counter
    for (const server of this.servers) {
      server.close();
    }
  }
}

module.exports = App;
