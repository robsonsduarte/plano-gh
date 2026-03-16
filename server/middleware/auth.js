import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'change-this-to-a-random-secret-in-production') {
  process.stderr.write('FATAL: JWT_SECRET nao definido ou usando valor default. Defina um secret seguro no .env\n');
  process.exit(1);
}

export default function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticacao ausente' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token invalido' });
  }
}
