import express, { Express } from 'express';
import { createRouter } from '@routes/index.js';
import { errorHandler } from '@middlewares/errorHandler.js';
import { notFound } from '@middlewares/notFound.js';

export function loadExpress(app: Express) {
  app.use(express.json());
  app.use(createRouter());
  app.use(notFound);
  app.use(errorHandler);
}
