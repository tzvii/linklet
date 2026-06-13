import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'node:path';
import cors from 'cors';
import { DynamoClient } from './clients/dynamo';
import { encoder } from './utils';

const app: Express = express();
app.use(express.json());
app.use(
  cors({ origin: process.env.ENV === 'prod' ? '*' : 'http://localhost:3000' })
);
app.use(express.static(path.join(__dirname, 'public')));

const ddb: DynamoClient = new DynamoClient({
  tableName: 'urls',
  partitionKey: 'id',
});

const API_KEY = process.env.API_KEY;

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    // return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await ddb.get({ id });

    if (!item || !item.url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.redirect(item.url);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve URL' });
  }
});

app.post('/api/create', authMiddleware, async (req: Request, res: Response) => {
  const url = req.body.url;

  const count = await ddb.incrementCounter();
  const id = encoder(count);

  const item: Record<string, any> = {
    id,
    url,
    created: Date.now(),
  };
  const r = await ddb.create(item);
  res.send(r);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode: number = err.cause?.statusCode ?? err.statusCode ?? 500;
  res.status(statusCode).json({
    error: err.message ?? 'Internal server error',
    status: statusCode,
  });
});

const PORT: number = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
