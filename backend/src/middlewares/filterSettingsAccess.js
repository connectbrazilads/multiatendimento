const { filterSettingsInput } = require('../auth/settingsAccess');

module.exports = (req, res, next) => {
  req.body = filterSettingsInput(req.user, req.body);
  next();
};
