module.exports = function (app) {
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    next();
  });
};
