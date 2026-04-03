import express, { Express } from 'express';
import { createRouter } from '../api/routes/index.js';
import { errorHandler } from '../api/middlewares/errorHandler.js';
import { notFound } from '../api/middlewares/notFound.js';

export function loadExpress(app: Express) {
  app.use(express.json());
  app.use(createRouter());
  app.use(notFound);
  app.use(errorHandler);
}
