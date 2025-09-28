import { DataTypes, Op } from "sequelize";
import { sequelize } from "../../config/mysql.js";
import bcrypt from 'bcrypt';
import crypto from "crypto";

// Modelo Sequelize
export const UserModel = sequelize.define("User", {
  mail:            { type: DataTypes.STRING, unique: true, allowNull: false },
  password:        { type: DataTypes.STRING, allowNull: false },
  name:            { type: DataTypes.STRING, allowNull: false },
  type:            { type: DataTypes.STRING, defaultValue: "user" },
  isVerified:      { type: DataTypes.BOOLEAN, defaultValue: false },
  verificationToken:   { type: DataTypes.STRING },
  verificationExpires: { type: DataTypes.DATE },
  googleId:        { type: DataTypes.STRING }
}, {
  tableName: "users",
  timestamps: true
});

export class User {
  static async findByEmail(mail) {
    return UserModel.findOne({ where: { mail } });
  }

  static async GetUser() {
    return UserModel.findAll();
  }

  static async Login(mail, password) {
    const found = await UserModel.findOne({ where: { mail } });
    if (!found) return null;
    const isValid = await bcrypt.compare(password, found.password);
    return isValid ? found : null;
  }

  static async register(mail, password, name) {
    const existing = await UserModel.findOne({ where: { mail } });
    if (existing) {
      const err = new Error('El mail ya está registrado');
      err.code = 'EMAIL_EXISTS';
      throw err;
    }
    const adminCount = await UserModel.count({ where: { type: 'admin' } });
    const assignedType = adminCount === 0 ? 'admin' : 'user';
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const userDoc = await UserModel.create({
      mail,
      password: hashedPassword,
      name,
      type: assignedType,
      isVerified: false,
      verificationToken,
      verificationExpires: new Date(Date.now() + 1000 * 60 * 60) // 1 hora
    });

    return {
      user: {
        id: userDoc.id,
        mail: userDoc.mail,
        name: userDoc.name,
        type: userDoc.type,
        verificationToken
      },
      message: "Usuario creado, revisa tu correo para verificar la cuenta"
    };
  }

  static async verifyAccount(token) {
    const user = await UserModel.findOne({
      where: {
        verificationToken: token,
        verificationExpires: { [Op.gt]: new Date() }
      }
    });
    if (!user) throw new Error("Token inválido o expirado.");

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();
    return user;
  }

  static async resendVerification(mail) {
    const user = await UserModel.findOne({ where: { mail } });
    if (!user) throw new Error("Usuario no encontrado");
    if (user.isVerified) throw new Error("El usuario ya está verificado");

    // Si token expiró o no existe, genera uno nuevo
    if (!user.verificationToken || !user.verificationExpires || user.verificationExpires < new Date()) {
      user.verificationToken = crypto.randomBytes(32).toString("hex");
      user.verificationExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
      await user.save();
    }

    return {
      mail: user.mail,
      name: user.name,
      verificationToken: user.verificationToken
    };
  }

  static async generateResetPassword(mail) {
    const user = await UserModel.findOne({ where: { mail } });
    if (!user) throw new Error("No existe ese usuario.");
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = resetToken;
    user.verificationExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
    await user.save();
    return { user, resetToken };
  }

  static async resetPassword(token, newPassword) {
    const user = await UserModel.findOne({
      where: {
        verificationToken: token,
        verificationExpires: { [Op.gt]: new Date() }
      }
    });
    if (!user) throw new Error("Token inválido o expirado.");

    user.password = await bcrypt.hash(newPassword, 10);
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();
    return user;
  }

  static async findOrCreateGoogleUser({ googleId, mail, name }) {
    let user = await UserModel.findOne({ where: { mail } });
    if (!user) {
      user = await UserModel.create({
        mail,
        name,
        googleId,
        isVerified: true,
        type: 'user',
        password: await bcrypt.hash(crypto.randomBytes(10).toString("hex"), 10) // random password
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.isVerified = true;
      await user.save();
    }
    return user;
  }
}