export const httpsRedirect = (req, res, next) => {
  if (process.env.ENFORCE_HTTPS === "true") {
    // Rely on req.secure (populated by Express if "trust proxy" is enabled)
    const isSecure = req.secure;
    if (!isSecure) {
      const port = process.env.HTTPS_PORT || 443;
      const host = req.hostname;
      const portSuffix = port == 443 ? '' : `:${port}`;
      return res.redirect(301, `https://${host}${portSuffix}${req.originalUrl}`);
    }
  }
  next();
};
