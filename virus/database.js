const mysql = require('mysql')
const {promisify} = require('util')

const pool = mysql.createPool({
    host: '45.132.157.204',
    user: 'u282904317_app_car',
    database: 'u282904317_app_car',
    password: '$HTnacz6@x2J'
})

pool.getConnection((err, connection) => {
    if(err){
        if(err.code === 'PROTOCOL_CONNECTION_LOST'){
            console.log('DATABASE CONNECTION WAS CLOSED')
        }
        if(err.code === 'ER_CON_COUNT_ERROR'){
            console.log('DATABASE HAS TO MANY CONNECTIONS')
        }
        if(err.code === 'ECONNREFUSED'){
            console.log('DATABASE CONNECTION WAS REFUSED')
        }
    }
    if(connection) connection.release()
    console.log('DB is Connected')
    return
})

pool.query = promisify(pool.query)
module.exports = pool
