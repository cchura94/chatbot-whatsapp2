const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bd_chatbot', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    port: 3306
});

// test de conexion con BD

async function testBD(){
    try {
        await sequelize.authenticate();
        console.log('CONEXION CORRECTA CON BD.');
      } catch (error) {
        console.error('ERROR DE CONEXION CON BD: ', error);
      }
}

testBD();


module.exports = sequelize