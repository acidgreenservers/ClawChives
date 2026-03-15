import { Request, Response, NextFunction } from 'express';

export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.ENFORCE_HTTPS === 'true') {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isSecure) {
      const port = process.env.HTTPS_PORT || 443;
      const host = req.hostname;
      const portSuffix = String(port) === '443' ? '' : `:${port}`;
      console.log(`[httpsRedirect] Redirecting ${req.method} ${req.originalUrl} → https://${host}${portSuffix}${req.originalUrl}`);
      return res.redirect(301, `https://${host}${portSuffix}${req.originalUrl}`);
    }
  }
  next();
};
