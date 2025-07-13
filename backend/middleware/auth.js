
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Obtener el token de la cabecera
  const token = req.header('x-auth-token');

  // Comprobar si no hay token
  if (!token) {
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }

  // Verificar token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'El token no es válido' });
  }
};
