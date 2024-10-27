const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./db');

const Contacto = sequelize.define('Contacto', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    numero: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    saldo: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    }
})

Contacto.sync();

module.exports = Contacto;