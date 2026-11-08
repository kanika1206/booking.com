import { Router } from 'express';
import { searchProperties, searchSchema } from './search.service.js';

export const searchRouter = Router();

searchRouter.get('/', async (req, res) => {
  res.json(await searchProperties(searchSchema.parse(req.query)));
});
