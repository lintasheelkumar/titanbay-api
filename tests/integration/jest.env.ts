import 'reflect-metadata'; // Must be before tsyringe is used
import 'dotenv/config';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
