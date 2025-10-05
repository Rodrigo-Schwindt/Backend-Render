import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from 'google-auth-library';
import { sendMail } from "../../utils/testemail.js";

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class UserController {
  constructor(model) {
    this.model = model;
  }

  getAll = async (req, res) => {
    try {
      const users = await this.model.GetUser();
      res.status(200).json(users);
    } catch (e) {
      res.status(500).json({ message: "Error al obtener usuarios", error: e.message });
    }
  };

  login = async (req, res) => {
    try {
      const { mail, password } = req.body;
      const found = await this.model.Login(mail, password);
      if (!found) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

      if (!process.env.JWT_SECRET) return res.status(500).json({ message: "JWT_SECRET no configurado" });

      if (found.type !== 'admin' && !found.isVerified) {
        return res.status(403).json({ message: "Debes verificar tu correo antes de iniciar sesión" });
      }

      const payload = {
        id: String(found.id),
        mail: found.mail,
        name: found.name,
        type: found.type
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.cookie('user-token', token, {
        httpOnly: false,
        secure: true, 
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24
      });

      return res.status(200).json({ user: found.name });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Error en login' });
    }
  };

  loginWithGoogle = async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) return res.status(400).json({ message: 'Falta el credential de Google' });

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { sub: googleId, email, name } = payload;
      const user = await this.model.findOrCreateGoogleUser({
        googleId,
        mail: email,
        name,
      });

      const jwtPayload = {
        id: String(user.id),
        mail: user.mail,
        name: user.name,
        type: user.type
      };
      const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.cookie('user-token', token, {
        httpOnly: false,
        secure: true, 
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24
      });

      return res.status(200).json({ user });
    } catch (e) {
      console.error('Error en login con Google', e);
      return res.status(500).json({ message: 'Error al loguear con Google' });
    }
  };

  register = async (req, res) => {
    try {
      const { mail, password, name } = req.body;
      if (!mail || !password || !name) {
        return res.status(400).json({ message: 'Faltan campos' });
      }

      const payload = await this.model.register(mail, password, name);

      // Enviar email de verificación
      const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${payload.user.verificationToken}`;
      await sendMail({
        to: payload.user.mail,
        subject: "Verifica tu cuenta",
        html: `<p>Hola ${payload.user.name}, haz clic en el siguiente enlace para verificar tu cuenta:</p>
               <a href="${verifyUrl}">Verificar cuenta</a>`
      });

      // No enviar token hasta que verifique correo
      return res.status(201).json({ user: payload.user });
    } catch (e) {
      if (e.code === 'EMAIL_EXISTS') {
        return res.status(409).json({ message: e.message });
      }
      console.error('Register error:', e);
      return res.status(500).json({ message: 'Error interno' });
    }
  };

  resendVerification = async (req, res) => {
    try {
      const { mail } = req.body;
      if (!mail) return res.status(400).json({ message: 'Mail requerido' });

      const payload = await this.model.resendVerification(mail);
      
      // 🌟 DIAGNÓSTICO CLAVE 🌟
      console.log('Payload de verificación:', payload); 

      // 🌟 MANEJO DE NO ENCONTRADO 🌟
      if (!payload) {
          return res.status(404).json({ message: "Usuario no encontrado o ya verificado" });
      }

      const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${payload.verificationToken}`;
      await sendMail({
        to: payload.mail,
        subject: "Reenvío de verificación de cuenta",
        html: `<p>Hola ${payload.name}, haz clic en el siguiente enlace para verificar tu cuenta:</p>
               <a href="${verifyUrl}">Verificar cuenta</a>`
      });

      return res.status(200).json({ message: "Correo de verificación reenviado" });
    } catch (e) {
      console.error("Error en resend verification:", e);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
  };

  auth = async (req, res) => {
    const token = req.cookies['user-token'];
    if (!token) {
      res.status(401).json({ message: 'No autorizado' });
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.status(200).json({
        success: true,
        data: {
          id: decoded.id || decoded.sub,
          mail: decoded.mail,
          name: decoded.name,
          type: decoded.type
        }
      });
    } catch (e) {
      console.error('Token verification error:', e);
      res.status(401).json({ message: 'Token inválido' });
    }
  };

  logout = async (req, res) => {
    try {
      res.clearCookie('user-token', {
        httpOnly: false,
        secure: true, 
        sameSite: 'none',
        path: '/'
      });
      res.status(200).json({
        success: true,
        message: 'Logout exitoso'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
  };

  forgotPassword = async (req, res) => {
    try {
      const { mail } = req.body;
      if (!mail) return res.status(400).json({ message: "Falta mail" });

      const { user, resetToken } = await this.model.generateResetPassword(mail);
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendMail({
        to: user.mail,
        subject: "Recuperar contraseña",
        html: `<p>Haz clic para cambiar tu contraseña:</p>
               <a href="${resetUrl}">Cambiar contraseña</a>`
      });
      res.status(200).json({ message: "Email de recuperación enviado." });
    } catch (e) {
      console.error('Error en forgot-password:', e);
      res.status(500).json({ message: "Error en recuperación" });
    }
  };

  resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Faltan datos" });
      }

      await this.model.resetPassword(token, newPassword);
      res.status(200).json({ message: "Contraseña actualizada correctamente." });
    } catch (e) {
      console.error('Error en reset-password:', e);
      res.status(500).json({ message: "Error al cambiar contraseña" });
    }
  };

  sendFactura = async (req, res) => {
    try {
      const { mail, facturaHtml } = req.body;
      if (!mail || !facturaHtml) {
        return res.status(400).json({ message: "Faltan datos para enviar factura" });
      }
      await sendMail({
        to: mail,
        subject: "Factura de compra",
        html: facturaHtml
      });
      res.status(200).json({ message: "Factura enviada." });
    } catch (e) {
      console.error('Error enviando factura:', e);
      res.status(500).json({ message: "Error enviando factura" });
    }
  };

  verify = async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ message: "Token no proporcionado" });
      await this.model.verifyAccount(token);
      return res.status(200).json({ message: "Cuenta verificada con éxito" });
    } catch (err) {
      console.error("Error en verificación:", err);
      return res.status(400).json({ message: err.message });
    }
  };
}