import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${err.name}: ${err.message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
  }

  const message = isProduction
    ? 'A tidepool disturbance occurred. The Reef is currently experiencing issues. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
